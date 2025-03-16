'use strict';
/* Semi-modernised version of @mapbox/vt2geojson */
import vt from 'vector-tile';
import Protobuf from 'pbf';
import zlib from 'zlib';
function readTile(args, buffer) {
    // handle zipped buffers
    if (buffer[0] === 0x78 && buffer[1] === 0x9c) {
        buffer = zlib.inflateSync(buffer);
    } else if (buffer[0] === 0x1f && buffer[1] === 0x8b) {
        buffer = zlib.gunzipSync(buffer);
    }
    const tile = new vt.VectorTile(new Protobuf(buffer));
    let layers = [args.layer || Object.keys(tile.layers)].flat();
    const features = [];
    for (const layerID of layers) {
        const layer = tile.layers[layerID];
        if (layer) {
            for (let i = 0; i < layer.length; i++) {
                const feature = layer
                    .feature(i)
                    .toGeoJSON(args.x, args.y, args.z);
                if (layers.length > 1) {
                    feature.properties.vt_layer = layerID;
                }
                features.push(feature);
            }
        }
    }
    return { type: 'FeatureCollection', features };
}
export default async function getVectorTile(options) {
    const uri = options.uri
        .replace('{x}', options.x)
        .replace('{y}', options.y)
        .replace('{z}', options.z);
    const body = await window
        .fetch(uri, { headers: options.headers ?? {} })
        .then(async (res) => {
            if (res.status === 200) {
                return new Uint8Array(await res.arrayBuffer());
            } else {
                throw new Error(
                    `Error retrieving data from ${options.uri}. Server responded with code: ${res.status}`
                );
            }
        });
    return readTile(options, body);
}
