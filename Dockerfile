# Prod Stage
FROM node:12.20.2-alpine3.12 as prod

ENV NODE_ENV=production

RUN apk add --no-cache tini

EXPOSE 5001

WORKDIR /src/app

COPY package*.json ./

RUN npm install --only=production && npm cache clean --force

COPY . ./

ENTRYPOINT [ "/sbin/tini","--" ]

CMD ["node","build/index.js"]

# Dev Stage
FROM prod as dev

ENV NODE_ENV=development

RUN npm install --only=development

CMD ["./node_modules/nodemon/bin/nodemon.js","./build/index.js"]

