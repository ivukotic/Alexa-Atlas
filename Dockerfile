FROM node:latest

LABEL maintainer Ilija Vukotic <ivukotic@cern.ch>

# Create app directory
WORKDIR /usr/src/app

COPY package*.json ./
# COPY start.sh ./
RUN npm -v
RUN npm install -g npm@8.1.3
RUN npm -v
RUN npm audit fix --force
RUN npm install

COPY . .

EXPOSE 80

CMD [ "npm","start" ]