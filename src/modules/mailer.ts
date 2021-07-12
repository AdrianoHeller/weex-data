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

export default transport;
