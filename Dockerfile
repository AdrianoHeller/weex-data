FROM node:12.20.2-alpine3.12

WORKDIR /src/app

COPY package*.json ./

RUN npm install && npm cache clear --force

COPY . .

EXPOSE 3001

EXPOSE 5001

CMD ["node","build/index.js"]