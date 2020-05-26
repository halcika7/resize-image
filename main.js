const path = require('path');
const os = require('os');
const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const imagemin = require('imagemin');
const imageminMozj = require('imagemin-mozjpeg');
const imageminPng = require('imagemin-pngquant');
const slash = require('slash');
const log = require('electron-log');

process.env.NODE_ENV = 'production';

const isDev = process.env.NODE_ENV !== 'production';
const isMac = process.platform === 'darwin';

let window;
let aboutWindow;

function createMainWindow() {
    window = new BrowserWindow({
        title: 'Image Shrink',
        width: isDev ? 800 : 500,
        height: 600,
        icon: `${__dirname}/assets/icons/Icon_256x256.png`,
        resizable: isDev,
        backgroundColor: 'white',
        webPreferences: { nodeIntegration: true },
    });

    if (isDev) {
        window.webContents.openDevTools();
    }

    window.loadFile('./app/index.html');
}

function createAboutWindow() {
    aboutWindow = new BrowserWindow({
        title: 'Image Shrink',
        width: 300,
        height: 300,
        icon: `${__dirname}/assets/icons/Icon_256x256.png`,
        resizable: false,
    });

    aboutWindow.loadFile('./app/about.html');
}

app.on('ready', () => {
    createMainWindow();

    const mainMenu = Menu.buildFromTemplate(menu);
    Menu.setApplicationMenu(mainMenu);

    window.on('ready', () => (window = null));
});

const menu = [
    ...(isMac
        ? [
              {
                  role: app.name,
                  submenu: [
                      {
                          label: 'About',
                          click: createAboutWindow,
                      },
                  ],
              },
          ]
        : []),
    ...(!isMac
        ? [
              {
                  label: 'Help',
                  submenu: [
                      {
                          label: 'About',
                          click: createAboutWindow,
                      },
                  ],
              },
          ]
        : []),
    {
        role: 'fileMenu',
    },
    ...(isDev
        ? [
              {
                  label: 'Developer',
                  submenu: [
                      { role: 'reload' },
                      { role: 'forcereload' },
                      { type: 'separator' },
                      { role: 'toggledevtools' },
                  ],
              },
          ]
        : []),
];

ipcMain.on('image:minimize', async (e, opts) => {
    opts.dest = path.join(os.homedir(), 'Documents/imageshrink');
    shrinkImage(opts);
});

async function shrinkImage({ imgPath, quality, dest }) {
    try {
        const pngQuality = quality / 100;

        const files = await imagemin([slash(imgPath)], {
            destination: dest,
            plugins: [
                imageminMozj({ quality }),
                imageminPng({ quality: [pngQuality, pngQuality] }),
            ],
        });

        log.info(files);

        shell.openPath(dest);

        window.webContents.send('image:done');
    } catch (error) {
        log.error(error);
    }
}

app.on('window-all-closed', () => {
    if (!isMac) {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
});
