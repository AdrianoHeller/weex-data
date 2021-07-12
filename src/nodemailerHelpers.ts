import { config } from 'dotenv';
import { join } from 'path';

config({path: join(__dirname,'../.env')});

export const transport = {
    port: Number(process.env.SMTP_PORT),
    host: process.env.SMTP_HOST,
    secure: false,
    auth: {
        user: process.env.USER,
        pass: process.env.PASS
    }
}