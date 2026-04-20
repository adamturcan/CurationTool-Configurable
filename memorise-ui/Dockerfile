# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .

ARG VITE_BASE_PATH=/
ARG VITE_BACKEND_URL=
ARG VITE_NER_API_URL=https://ner-api.dev.memorise.sdu.dk/recognize
ARG VITE_SEGMENT_API_URL=https://textseg-api.dev.memorise.sdu.dk/segment
ARG VITE_CLASSIFY_API_URL=https://semtag-api.dev.memorise.sdu.dk/classify
ARG VITE_TRANSLATION_API_URL=https://mt-api.dev.memorise.sdu.dk/translate
ARG VITE_TRANSLATION_LANGUAGES_URL=https://mt-api.dev.memorise.sdu.dk/supported_languages
ARG VITE_THESAURUS_URL=
ARG VITE_APP_TITLE=
ARG VITE_APP_LOGO=
ARG VITE_APP_LOGO_FULL=

RUN echo "VITE_BASE_PATH=$VITE_BASE_PATH" > .env && \
    echo "VITE_BACKEND_URL=$VITE_BACKEND_URL" >> .env && \
    echo "VITE_NER_API_URL=$VITE_NER_API_URL" >> .env && \
    echo "VITE_SEGMENT_API_URL=$VITE_SEGMENT_API_URL" >> .env && \
    echo "VITE_CLASSIFY_API_URL=$VITE_CLASSIFY_API_URL" >> .env && \
    echo "VITE_TRANSLATION_API_URL=$VITE_TRANSLATION_API_URL" >> .env && \
    echo "VITE_TRANSLATION_LANGUAGES_URL=$VITE_TRANSLATION_LANGUAGES_URL" >> .env && \
    [ -n "$VITE_THESAURUS_URL" ] && echo "VITE_THESAURUS_URL=$VITE_THESAURUS_URL" >> .env; \
    [ -n "$VITE_APP_TITLE" ] && echo "VITE_APP_TITLE=$VITE_APP_TITLE" >> .env; \
    [ -n "$VITE_APP_LOGO" ] && echo "VITE_APP_LOGO=$VITE_APP_LOGO" >> .env; \
    [ -n "$VITE_APP_LOGO_FULL" ] && echo "VITE_APP_LOGO_FULL=$VITE_APP_LOGO_FULL" >> .env; \
    true

RUN if [ -f public/thesaurus-full.json ]; then node scripts/buildThesaurusIndex.js; fi && \
    npx tsc -b && npx vite build

# Stage 2: Serve
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
