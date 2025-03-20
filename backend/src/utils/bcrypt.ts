import bcrypt from "bcrypt";

export const hashValue = async (value: string, saltRounds: number = 10) => 
    await bcrypt.hash(value, saltRounds);
