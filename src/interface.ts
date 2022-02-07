import { Decimal } from "@prisma/client/runtime"

export interface IOneId {
  id: number
}

export interface IUserId {
  userId: number
}

export interface IManyId {
  ids: IOneId[]
}

// imagesInfo
export interface IImageInfo {
  name: string,
  url: string
}

// user related
export interface ISignin {
  email: string
  password: string
}

export interface ISignup {
  display_name: string
  email: string
  password: string
  confirm: string
}

export interface IUserUpdate {
  first_name?: string
  last_name?: string
  other_name?: string
  display_name?: string
  email?: string
}

export enum IRole {
  crt = "creator",
  adm = "admin",
  col = "collector"
}

export interface IRoleBody {
  role: string
}

// works related
export interface IWork {
  title: string
  categoryId?: number
  description?: string
  studioId?: number
  creatorId: number
}

// studio related
export interface IStudio {
  name: string
  description?: string
  creatorId: number
}

export interface IStudioName {
  name: string
}

//  reactions related
export interface IReact {
  userId: number
  type: IReactions
}

export enum IReactions {
  like = "like",
  love = "love"
}

export interface IExhibition {
  id?: number
  description?: string
  price: Decimal
  currency: string
  sellAs: string
  creatorRef: string
  work?: IWork
}

// contact related
export interface IContact {
  type: IContactType
  phone: string
  email: string
  address: string
  position?: string
}

export enum IContactType {
  main = "defualt",
  others = "others"
}

export interface IContacts {
  contacts: IContact[]
}

// skills related
export interface ISkill {
  categoryId: number
  name: string
  description: string
}

export interface ISkills {
  skills: ISkill[]
}

// post related
export interface IPost {
  slug?: string
  title: string
  content: string
}

export interface ISlug {
  slug: string
}

// comment related
export interface IComment {
  commentId: number
  postId: number
  message: string
}

// rewiew related
export interface IReview {
  rating: number
  userId: number
  comment?: string
}

// category related
export interface ICategory {
  name: string
  description?: string
  p_categoryId?: string
}

// job related
export interface IJob {
  title: string
  categoryId: string
  description?: string
}

// file related
export interface IFile {
  file: object
}

export interface IFiles {
  files: object[] | string[] | object | string
}

export interface IMessage {
  id?: number
  fromId: number
  toId: number
  message: string
  p_messageId?: number
}