// /pages/api/graphql.ts
import { ApolloServer ,} from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { gql } from 'graphql-tag';
import { IResolvers } from "@graphql-tools/utils";
import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { ObjectId, Db } from "mongodb";
import client_promise from '../../lib/mongodb_sample';
import { JwtPayload } from "jsonwebtoken";

const client = await client_promise;
const db = client.db('MyServer');
const users = db.collection('users');

const typeDefs = gql`
  type User {
  id: ID!
  username: String!
  email: String!
}

type Media {
  type: String!   # "image", "video"
  url: String!
}

type Post {
  id: ID!
  user: User!
  subject: String!
  content: String!
  media: [Media]
  tags: [String]
  likesCount: Int!
  commentsCount: Int!
  createdAt: String!
  updatedAt: String
  visibility: String! # "public", "friends-only", "private"
}

type Comment {
  id: ID!
  postId: ID!
  user: User!
  text: String!
  createdAt: String!
}

type Like {
  id: ID!
  postId: ID!
  user: User!
  createdAt: String!
}

type Query {
  posts(userId: ID): [Post!]!
  post(id: ID!): Post
  comments(postId: ID!): [Comment!]!
}

type Mutation {
  createPost(userId: ID!,subject: String!, content: String!, media: [String], tags: [String]): Post!
  updatePost(id: ID!, content: String, tags: [String]): Post!
  deletePost(id: ID!): Boolean!
  addComment(postId: ID!, userId: ID!, text: String!): Comment!
  likePost(postId: ID!, userId: ID!): Like!
}

`;

// const resolvers = {
//   Query: {
//     hello: () => 'Hello from serverless GraphQL!',
//     getUserData:(_parents:any,_args:any,context:any) => {
//       return {username:context.username,uid:context.uid,email:context.email};
//     }
//   },
// };
// Post type
interface Post {
  id?: string;
  userId: ObjectId;
  content: string;
  subject: string;
  media?: { type: string; url: string }[];
  tags?: string[];
  likesCount: number;
  commentsCount: number;
  createdAt: Date;
  updatedAt?: Date;
  visibility: string;
}

// Comment type
interface Comment {
  id?: string;
  postId: ObjectId;
  userId: ObjectId;
  text: string;
  createdAt: Date;
}

// Like type
interface Like {
  id?: string;
  postId: ObjectId;
  userId: ObjectId;
  createdAt: Date;
}

// Resolver args
interface PostArgs {
  id: string;
}
interface PostsArgs {
  userId?: string;
}
interface CreatePostArgs {
  userId: string;
  subject: string;
  content: string;
  media?: string[];
  tags?: string[];
}
interface UpdatePostArgs {
  id: string;
  subject?: string;
  content?: string;
  tags?: string[];
}
interface DeletePostArgs {
  id: string;
}
interface AddCommentArgs {
  postId: string;
  userId: string;
  text: string;
}
interface LikePostArgs {
  postId: string;
  userId: string;
}

export const resolvers = {
  Query: {
    posts: async (
      _: unknown,
      { userId }: PostsArgs
    ): Promise<Post[]> => {
      const query = userId ? { userId: new ObjectId(userId) } : {};
      const posts = await db.collection<Post>("posts").find(query).toArray();
      return posts.map(p => ({ id: p._id?.toString(), ...p }));
    },

    post: async (
      _: unknown,
      { id }: PostArgs,
      // { db }: Context
    ): Promise<Post | null> => {
      const post = await db
        .collection<Post>("posts")
        .findOne({ _id: new ObjectId(id) });
      return post ? { id: post._id?.toString(), ...post } : null;
    },

    comments: async (
      _: unknown,
      { postId }: { postId: string },
      // { db }: Context
    ): Promise<Comment[]> => {
      const comments = await db
        .collection<Comment>("comments")
        .find({ postId: new ObjectId(postId) })
        .toArray();
      return comments.map(c => ({ id: c._id?.toString(), ...c }));
    },
  },

  Mutation: {
    createPost: async (
      _: unknown,
      { userId,subject, content, media, tags }: CreatePostArgs,
      context: MyContext
    ): Promise<Post> => {
       if (!context.user) throw new Error("Not authenticated");
      const post: Omit<Post, "id"> = {
        userId: new ObjectId(userId),
        subject,
        content,
        media: media?.map(url => ({ type: "image", url })),
        tags,
        likesCount: 0,
        commentsCount: 0,
        createdAt: new Date(),
        visibility: "public",
      };
      const result = await db.collection<Post>("posts").insertOne(post);
      return { id: result.insertedId.toString(), ...post };
    },

    updatePost: async (
      _: unknown,
      { id,subject, content, tags }: UpdatePostArgs,
      context: MyContext
    ): Promise<Post | null> => {
       if (!context.user) throw new Error("Not authenticated");
      await db.collection<Post>("posts").updateOne(
        { _id: new ObjectId(id) },
        { $set: {subject, content, tags, updatedAt: new Date() } }
      );
      const updated = await db
        .collection<Post>("posts")
        .findOne({ _id: new ObjectId(id) });
      return updated ? { id: updated._id?.toString(), ...updated } : null;
    },

    deletePost: async (
      _: unknown,
      { id }: DeletePostArgs,
      context: MyContext
    ): Promise<boolean> => {
      if (!context.user) throw new Error("Not authenticated");
      const result = await db
        .collection<Post>("posts")
        .deleteOne({ _id: new ObjectId(id) });
      return result.deletedCount > 0;
    },

    addComment: async (
      _: unknown,
      { postId, userId, text }: AddCommentArgs,
      // { db }: Context
    ): Promise<Comment> => {
      const comment: Omit<Comment, "id"> = {
        postId: new ObjectId(postId),
        userId: new ObjectId(userId),
        text,
        createdAt: new Date(),
      };
      const result = await db.collection<Comment>("comments").insertOne(comment);
      await db
        .collection<Post>("posts")
        .updateOne({ _id: new ObjectId(postId) }, { $inc: { commentsCount: 1 } });
      return { id: result.insertedId.toString(), ...comment };
    },

    likePost: async (
      _: unknown,
      { postId, userId }: LikePostArgs,
      // { db }: Context
    ): Promise<Like> => {
      const like: Omit<Like, "id"> = {
        postId: new ObjectId(postId),
        userId: new ObjectId(userId),
        createdAt: new Date(),
      };
      const result = await db.collection<Like>("likes").insertOne(like);
      await db
        .collection<Post>("posts")
        .updateOne({ _id: new ObjectId(postId) }, { $inc: { likesCount: 1 } });
      return { id: result.insertedId.toString(), ...like };
    },
  },
};
interface MyContext {
  user?: JwtPayload | null;
}

const server = new ApolloServer({ typeDefs, resolvers});

export default startServerAndCreateNextHandler(server, {
  context: async (req: NextApiRequest, res: NextApiResponse): Promise<MyContext> => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];
    let decoded: JwtPayload | null = null;

    if (!process.env.SECRET_KEY) {
      throw new Error("SECRET_KEY is not defined in environment variables");
    }

    if (token) {
      try {
        decoded = jwt.verify(token, process.env.SECRET_KEY) as JwtPayload;
      } catch (err) {
        // throw new Error("Invalid token"); // Apollo will return 401 automatically
        res.status(401).end();
      }
    }

    return { user: decoded };
  },
});

