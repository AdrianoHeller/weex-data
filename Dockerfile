# Prod Stage
FROM node:12.20.2-alpine3.12 as builder

WORKDIR /src/app

RUN mkdir -p /src/app/build

COPY package*.json ./

RUN npm install --only=production && npm cache clean --force

RUN npm install -g typescript

COPY src/ ./src

COPY tsconfig.json ./

RUN tsc

FROM builder as prod

RUN apk add --no-cache tini

EXPOSE 5001

COPY --from=builder /src/app/build/ ./build

ENTRYPOINT [ "/sbin/tini","--" ]

CMD ["node","build/index.js"]

FROM nginx:1.18.0

COPY --from=prod ./build/ /usr/share/nginx/html

COPY nginx/nginx.conf /usr/share/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx","-g","daemon off;"]

# Dev Stage
# FROM prod as dev

# ENV NODE_ENV=development

# RUN npm install --only=development

# CMD ["./node_modules/nodemon/bin/nodemon.js","./build/index.js"]

