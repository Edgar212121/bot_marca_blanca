FROM node:11.2.0

WORKDIR /app
COPY . /app
RUN npm install
