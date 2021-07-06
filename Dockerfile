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

CMD ["node","build/serverOp.js"]


