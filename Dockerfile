FROM node:latest

LABEL maintainer Ilija Vukotic <ivukotic@cern.ch>

# Create app directory
WORKDIR /usr/src/app

COPY package*.json ./
# COPY start.sh ./
RUN npm -v
RUN npm install -g npm@latest
RUN npm -v
RUN npm install

COPY . .

EXPOSE 80

CMD [ "npm","start" ]