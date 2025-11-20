import jwt from "jsonwebtoken";
import bcrypt, { compare } from "bcrypt";
import { prisma } from "./prisma";
export async function hashPassword(password: string) {
    const salt =await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
};

export async function comparePassword(password:string,hashPassword:string){
    return bcrypt.compare(password,hashPassword);
};
export function generateToken(payload:object){
    if(!process.env.JWT_SECRET){
        throw new Error("JWT_SECRET is not defined");
    }
    return jwt.sign(payload, process.env.JWT_SECRET, {expiresIn:'7d'});
}

export function verifyToken(token:string){
    if(!process.env.JWT_SECRET){
        throw new Error("JWT_SECRET is not defined");
    }
    try{

        return jwt.verify(token, process.env.JWT_SECRET);
    }catch(err){
        return null;
    }
}
export async function authenticateUser(email:string,password:string){
    const user=await prisma.user.findUnique({where:{email}});
    if(!user){
        throw new Error("NO user found");
    }
    const isValid=await comparePassword(password,user.password);
    if(!isValid){
        throw new Error("Invalid password");
    }
    const token=generateToken({id:user.id,email:user.email});
    return {user,token};

}
export async function createUser(email:string,password:string,fullname:string,username:string){
    const exist=await prisma.user.findUnique({where:{email}});
    if(exist){
        throw new Error("User already exists");
    }
    const hashedPassword=await hashPassword(password);
    const user=await prisma.user.create({
        data:{
            email,
            password:hashedPassword,
            fullname:fullname,
            username:username,
            avatar:"",
            coverImage:""
        }
    });
    return user;
}