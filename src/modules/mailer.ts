// import path from "path";
// import hbs,{ NodemailerExpressHandlebarsOptions } from "nodemailer-express-handlebars";
import nodemailer from "nodemailer";
import config from "../config/mail";

const { host, port, user, pass } = config;

const transport = nodemailer.createTransport({
  host,
  port,
  auth: {
    user,
    pass,
  },
});

// transport.use(
//   "compile",
//   hbs({
//     viewEngine: "handlebars",
//     viewPath: path.resolve("./src/resources/mail/auth"),
//     extname: ".html",
//   } as any)
// );

export default transport;
