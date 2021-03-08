ARG BUILD_FROM
FROM $BUILD_FROM

RUN apk add linux-headers --repository=http://dl-cdn.alpinelinux.org/alpine/edge/main
#RUN apt-get update || : && apt-get install python make g++ -y
RUN apk add --no-cache nodejs-npm jq python2 make g++ 

ENV LANG C.UTF-8

COPY package.json /

RUN npm install serialport --build-from-source
RUN npm install

# Copy data for add-on
COPY run.sh /
COPY server.js /
COPY dist /dist
RUN chmod a+x /run.sh

CMD [ "/run.sh" ]