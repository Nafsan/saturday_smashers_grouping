module.exports = {
    // Keep Vite's production transform unchanged; this config is for Jest.
    env: {
        test: {
            presets: [
                ['@babel/preset-env', { targets: { node: 'current' } }],
                ['@babel/preset-react', { runtime: 'automatic' }],
                ['babel-preset-vite', { env: true, glob: false }],
            ],
        },
    },
};
