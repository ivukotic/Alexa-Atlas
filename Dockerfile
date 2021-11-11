FROM node:current

LABEL maintainer Ilija Vukotic <ivukotic@cern.ch>

# Create app directory
WORKDIR /usr/src/app

COPY package*.json ./
# COPY start.sh ./
RUN npm install -g npm@latest
RUN npm audit fix
RUN npm install

COPY . .

EXPOSE 80

CMD [ "npm","start" ]