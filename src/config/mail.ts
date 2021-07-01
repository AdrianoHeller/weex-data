<<<<<<< HEAD
import { config } from "dotenv";
import { join } from "path";

config({ path: join(__dirname, "../.env") });

const configure = {
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
};

export default configure;
=======
import { config } from 'dotenv';
import { join } from 'path';

config({
  path: join(__dirname,'../.env')
});

const params = {
  host: process.env.SMTP_HOST!,
  port: Number(process.env.SMTP_PORT!),
  user: process.env.SMTP_USER!,
  pass: process.env.SMTP_PASS!,
};

export default params;
>>>>>>> 84256568bfbdd228f0b5b6ece0312e71568d0a85
