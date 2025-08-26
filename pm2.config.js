module.exports = {
    apps: [{
        name: 'changenow-bot',
        script: 'node',
        args: 'dist/index.js',
        error_file: '../.pm2/logs/error.log',
        out_file: '../.pm2/logs/out.log',
        cwd: __dirname,
        restart_delay: 3000,
        autorestart: true,
        max_restarts: 50,
    }]
}