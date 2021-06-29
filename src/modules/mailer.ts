import path from "path";
import nodemailer from "nodemailer";
import hbs, {
  NodemailerExpressHandlebarsOptions,
} from "nodemailer-express-handlebars";
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

transport.use(
  "compile",
  hbs({
    viewEngine: "handlebars",
    viewPath: path.resolve("./src/resources/mail"),
    extname: ".html",
  }) as NodemailerExpressHandlebarsOptions
);

export default transport;
