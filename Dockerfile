FROM buildkite/puppeteer

WORKDIR /app
COPY . .

RUN npm install --prod

EXPOSE 8080
ENV PORT 8080
ENV NODE_ENV prod
CMD ["node", "src/responder.js"]