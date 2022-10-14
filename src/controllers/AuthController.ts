// import { PrismaClient, User } from "@prisma/client";
// import { randomBytes } from "crypto";
// import { createSigner, createVerifier } from "fast-jwt";
// import { FastifyInstance } from "fastify";
// import {
//   checkEmail,
//   checkMatchPassword,
//   checkPassword,
// } from "../utils/checkers";
// const prisma = new PrismaClient();

// interface LoginI {
//   email: string;
//   password: string;
//   client?: string;
// }

// interface RegisterI extends LoginI {
//   user: User;
//   confirm_password: string;
// }

// interface ResetPasswordI extends LoginI {
//   confirm_password: string;
//   token: string;
// }

// const JWT_Signer = createSigner({
//   key: process.env.REFRESH_SECRET,
//   expiresIn: 6.048e8,
// });
// const JWT_Verifier = createVerifier({ key: process.env.REFRESH_SECRET });

// const register = async (info: RegisterI, fastify: FastifyInstance) => {
//   const errors: string[] = [];
//   const emailCheck = checkEmail(info.email);
//   const passwordCheck = checkPassword(info.password);
//   if (!emailCheck) errors.push("invalid email format");

//   if (!passwordCheck)
//     errors.push(
//       "invalid password format 6+ characters, 1+ uppercase, 1+ symbols or number "
//     );

//   const emailExists = emailCheck
//     ? await prisma.auth.findUnique({
//         where: {
//           email: info.email,
//         },
//       })
//     : undefined;

//   if (emailExists && emailCheck)
//     errors.push(`user with email "${info.email}" already exists`);

//   const displayNameExists = emailCheck
//     ? await prisma.user.findUnique({
//         where: {
//           display_name: info.user.display_name,
//         },
//       })
//     : undefined;

//   if (displayNameExists)
//     errors.push(
//       `user with display_name "${info.user.display_name}" already exists`
//     );

//   !checkMatchPassword(info.password, info.confirm_password)
//     ? errors.push(`passwords do not match`)
//     : (info.password = await fastify.bcrypt.hash(info.password));

//   if (errors.length)
//     return {
//       errors,
//     };

//   try {
//     const user = await prisma.auth.create({
//       data: {
//         email: info.email,
//         password: info.password,
//         user: {
//           create: {
//             ...info.user,
//           },
//         },
//       },
//     });
//     return user;
//   } catch (error) {
//     console.log(error);
//   }
// };

// const login = async (info: LoginI, fastify: FastifyInstance) => {
//   const errors: string[] = [];
//   const emailCheck = checkEmail(info.email);
//   const passwordCheck = checkPassword(info.password);
//   if (!emailCheck) errors.push("invalid email format");

//   if (!passwordCheck)
//     errors.push(
//       "invalid password format 6+ characters, 1+ uppercase, 1+ symbols or number "
//     );

//   const auth = emailCheck
//     ? await prisma.auth.findUnique({
//         where: {
//           email: info.email,
//         },
//       })
//     : undefined;

//   const verifyPassword = auth
//     ? await fastify.bcrypt.compare(info.password, auth.password)
//     : false;

//   if (!verifyPassword || !auth) errors.push("invalid user credentials");

//   if (errors.length)
//     return {
//       errors,
//     };

//   const refreshToken = JWT_Signer({
//     email: info.email,
//     client: info.client,
//     role: auth?.role,
//   });

//   try {
//     const session = await prisma.session.create({
//       data: {
//         token: refreshToken,
//         auth: {
//           connect: {
//             email: info.email,
//           },
//         },
//       },
//     });

//     const authToken = fastify.jwt.sign({
//       session: session.id,
//       role: auth?.role,
//     });

//     const user = await prisma.session.update({
//       where: {
//         id: session.id,
//       },
//       data: {
//         authToken,
//       },
//       include: { auth: true },
//     });

//     return {
//       authToken,
//       refreshToken,
//       user: { ...user.auth, password: undefined },
//     };
//   } catch (error) {
//     console.log(error);
//   }
// };

// const logout = async (token: string) => {
//   const session = await prisma.session.update({
//     where: {
//       token,
//     },
//     data: {
//       expired: true,
//     },
//   });
//   return session.expired;
// };

// const forgotPassword = async (email: string) => {
//   const errors: string[] = [];
//   const emailCheck = checkEmail(email);
//   if (!emailCheck) errors.push("invalid email format");

//   const emailExists = emailCheck
//     ? await prisma.auth.findUnique({
//         where: {
//           email,
//         },
//       })
//     : undefined;

//   if (!emailExists) errors.push(`user with email "${email}" doesn't exists`);

//   if (errors.length)
//     return {
//       errors,
//     };

//   try {
//     const recovery = await prisma.authRecovery.create({
//       data: {
//         token: randomBytes(256).toString("hex"),
//         auth: {
//           connect: {
//             email,
//           },
//         },
//       },
//     });
//     const resetToken = JWT_Signer(recovery);
//     if (recovery)
//       return {
//         resetToken,
//       };
//   } catch (error) {
//     console.log(error);
//   }
// };

// const resetPassword = async (
//   info: ResetPasswordI,
//   fastify: FastifyInstance
// ) => {
//   const errors: string[] = [];
//   const emailCheck = checkEmail(info.email);
//   const passwordCheck = checkPassword(info.password);
//   if (!emailCheck) errors.push("invalid email format");

//   if (!passwordCheck)
//     errors.push(
//       "invalid password format 6+ characters, 1+ uppercase, 1+ symbols or number "
//     );

//   if (!checkMatchPassword(info.password, info.confirm_password))
//     errors.push(`passwords do not match`);

//   const emailExists = emailCheck
//     ? await prisma.auth.findUnique({
//         where: {
//           email: info.email,
//         },
//       })
//     : undefined;

//   if (!emailExists)
//     errors.push(`user with email "${info.email}" doesn't exists`);

//   !checkMatchPassword(info.password, info.confirm_password)
//     ? errors.push(`passwords do not match`)
//     : (info.password = await fastify.bcrypt.hash(info.password));

//   const checkToken = JWT_Verifier(info.token);

//   if (!checkToken) {
//     errors.push("invalid or expired token");
//   }

//   if (errors.length)
//     return {
//       errors,
//     };
//   try {
//     const user = await prisma.auth.update({
//       where: { id: checkToken.authId },
//       data: {
//         password: info.password,
//       },
//     });
//     return user;
//   } catch (error) {
//     console.log(error);
//   }
// };

// const refreshAuth = async (
//   info: { refreshToken: string; client: string; authToken: string },
//   fastify: FastifyInstance
// ) => {
//   const errors: string[] = [];
//   const checkToken = JWT_Verifier(info.refreshToken);

//   if (!checkToken) errors.push("invalid or expired refresh token");

//   const tokenFromDb = await prisma.session.findUnique({
//     where: {
//       token: info.refreshToken,
//     },
//     include: { auth: true },
//   });

//   if (!tokenFromDb) errors.push("corrupted refresh token");

//   if (tokenFromDb?.authToken !== info.authToken)
//     errors.push("corrupted auth token");

//   if (errors.length) return errors;

//   const authToken = fastify.jwt.sign({
//     session: tokenFromDb?.id,
//     role: tokenFromDb?.auth.role,
//   });

//   return {
//     authToken,
//     refreshToken: tokenFromDb?.token,
//     user: { ...tokenFromDb?.auth, password: undefined },
//   };
// };

// const oAuthLogin = async (provider: string, info: object) => {};

// const oAuthRegister = async (provider: string, info: object) => {};

// export {
//   register,
//   login,
//   logout,
//   refreshAuth,
//   resetPassword,
//   forgotPassword,
//   oAuthLogin,
//   oAuthRegister,
// };

console.log(Date.now());
