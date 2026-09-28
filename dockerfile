FROM node:20-alpine

# Install build tools + TA-Lib
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    linux-headers \
    ta-lib \
    ta-lib-dev

WORKDIR /src

COPY package*.json ./

RUN npm install

COPY . .

CMD ["npm", "start"]
