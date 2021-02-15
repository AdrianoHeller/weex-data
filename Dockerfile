FROM node:12.20.2-alpine3.12

WORKDIR /src/app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3001

CMD ["node","build/index.js"]