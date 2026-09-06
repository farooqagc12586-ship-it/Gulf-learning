const CACHE_NAME = "quran-webapp-v1";

const APP_FILES = [
    "./",
    "./index.html",
    "./manifest.json"
];

self.addEventListener("install", event => {

    event.waitUntil(

        caches.open(CACHE_NAME)
        .then(cache =>
            cache.addAll(APP_FILES)
        )

    );

    self.skipWaiting();

});


self.addEventListener("activate", event => {

    event.waitUntil(
        self.clients.claim()
    );

});


self.addEventListener("fetch", event => {

    event.respondWith(

        caches.match(event.request)
        .then(cached => {

            if(cached){

                return cached;

            }

            return fetch(event.request)
            .then(response => {

                if(
                    response &&
                    response.status === 200
                ){

                    const copy=
                        response.clone();

                    caches.open(CACHE_NAME)
                    .then(cache =>
                        cache.put(
                            event.request,
                            copy
                        )
                    );

                }

                return response;

            });

        })

    );

});
