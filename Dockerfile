FROM node:12.20.2-alpine3.12

RUN apk add --no-cache tini

EXPOSE 3001

WORKDIR /src/app

COPY package*.json ./

RUN npm install && npm cache clean --force

COPY . .

ENTRYPOINT [ "/sbin/tini","--" ]

CMD ["node","build/index.js"]