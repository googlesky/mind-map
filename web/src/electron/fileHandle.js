import { BrowserWindow, ipcMain, dialog, shell } from 'electron'
import fs from 'fs-extra'
import path from 'path'
import {
  saveToRecent,
  clearRecent,
  removeFileInRecent,
  removeMultiFileInRecent,
  replaceFileInRecent,
  getRecent,
  saveFileListToRecent,
  saveEditWindowSize,
  getEditWindowSize
} from './storage'
import { v4 as uuid } from 'uuid'

export const bindFileHandleEvent = ({ mainWindow }) => {
  // 通知主页面刷新最近文件列表
  const notifyMainWindowRefreshRecentFileList = () => {
    if (!mainWindow) return
    mainWindow.webContents.send('refreshRecentFileList')
  }

  // 新建更新日志页面
  let changelogWindow = null
  ipcMain.on('openChangelogPage', async () => {
    if (changelogWindow) {
      changelogWindow.moveTop()
      return
    }
    changelogWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      frame: false,
      titleBarStyle: 'hiddenInset',
      webPreferences: {
        webSecurity: false,
        nodeIntegration: true,
        enableRemoteModule: true,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      }
    })
    changelogWindow.on('closed', () => {
      changelogWindow = null
    })
    if (process.env.WEBPACK_DEV_SERVER_URL) {
      // 如果处于开发模式，则加载开发服务器的url
      await changelogWindow.loadURL(
        process.env.WEBPACK_DEV_SERVER_URL + '/#/workbenche/changelog'
      )
      if (!process.env.IS_TEST) changelogWindow.webContents.openDevTools()
    } else { 
      // 非开发环境时加载index.html
      changelogWindow.loadURL('app://./index.html/#/workbenche/changelog')
    }
  })

  // 新建会员页面
  let vipWindow = null
  ipcMain.on('openVipPage', async () => {
    if (vipWindow) {
      vipWindow.moveTop()
      return
    }
    vipWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      frame: false,
      titleBarStyle: 'hiddenInset',
      webPreferences: {
        webSecurity: false,
        nodeIntegration: true,
        enableRemoteModule: true,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      }
    })
    vipWindow.on('closed', () => {
      vipWindow = null
    })
    if (process.env.WEBPACK_DEV_SERVER_URL) {
      // 如果处于开发模式，则加载开发服务器的url
      await vipWindow.loadURL(
        process.env.WEBPACK_DEV_SERVER_URL + '/#/workbenche/vip'
      )
      if (!process.env.IS_TEST) vipWindow.webContents.openDevTools()
    } else { 
      // 非开发环境时加载index.html
      vipWindow.loadURL('app://./index.html/#/workbenche/vip')
    }
  })

  // 新建帮助页面
  let helpWindow = null
  ipcMain.on('openHelpPage', async () => {
    if (helpWindow) {
      helpWindow.moveTop()
      return
    }
    helpWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      frame: false,
      titleBarStyle: 'hiddenInset',
      webPreferences: {
        webSecurity: false,
        nodeIntegration: true,
        enableRemoteModule: true,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      }
    })
    helpWindow.on('closed', () => {
      helpWindow = null
    })
    if (process.env.WEBPACK_DEV_SERVER_URL) {
      // 如果处于开发模式，则加载开发服务器的url
      await helpWindow.loadURL(
        process.env.WEBPACK_DEV_SERVER_URL + '/#/workbenche/help'
      )
      if (!process.env.IS_TEST) helpWindow.webContents.openDevTools()
    } else { 
      // 非开发环境时加载index.html
      helpWindow.loadURL('app://./index.html/#/workbenche/help')
    }
  })

  // 新建编辑页面
  const openIds = []
  const openIdToWin = {}
  const windowSize = getEditWindowSize() || {}
  const createEditWindow = async (event, id, isCreate) => {
    openIds.push(id)
    const options = {
      frame: false,
      titleBarStyle: 'hiddenInset',
      webPreferences: {
        webSecurity: false,
        nodeIntegration: true,
        enableRemoteModule: true,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      }
    }
    if (windowSize.width && windowSize.height) {
      options.width = windowSize.width
      options.height = windowSize.height
    } else {
      options.width = 1200
      options.height = 800
    }
    const win = new BrowserWindow(options)
    if (windowSize.maximize) {
      win.maximize()
    }
    openIdToWin[id] = win
    win.on('closed', () => {
      // 从openIds数组中删除
      const index = openIds.findIndex(item => {
        return item === id
      })
      delete openIdToWin[id]
      if (index !== -1) {
        openIds.splice(index, 1)
      }
      // 从idToFilePath中删除
      delete idToFilePath[id]
    })
    win.on('resize', () => {
      const size = win.getSize()
      windowSize.width = size[0]
      windowSize.height = size[1]
      saveEditWindowSize({
        ...windowSize
      })
    })
    win.on('maximize', () => {
      windowSize.maximize = true
      saveEditWindowSize({
        ...windowSize
      })
    })
    win.on('unmaximize', () => {
      windowSize.maximize = false
      saveEditWindowSize({
        ...windowSize
      })
    })
    const query = isCreate ? '?isCreate=true' : ''
    if (process.env.WEBPACK_DEV_SERVER_URL) {
      // Load the url of the dev server if in development mode
      win.loadURL(
        process.env.WEBPACK_DEV_SERVER_URL + '/#/workbenche/edit/' + id + query
      )
      if (!process.env.IS_TEST) win.webContents.openDevTools()
    } else {
      // Load the index.html when not in development
      win.loadURL('app://./index.html/#/workbenche/edit/' + id + query)
    }
  }
  ipcMain.on('create', (...args) => {
    createEditWindow(...args, true)
  })

  // 获取窗口是否处于最大化
  ipcMain.handle('getIsMaximize', (event, id) => {
    if (openIdToWin[id]) {
      return openIdToWin[id].isMaximized()
    }
    return false
  })

  // 保存文件
  const idToFilePath = {}
  ipcMain.handle(
    'save',
    async (event, id, data, fileName = '未命名', defaultPath = '') => {
      if (!idToFilePath[id]) {
        const webContents = event.sender
        const win = BrowserWindow.fromWebContents(webContents)
        const res = dialog.showSaveDialogSync(win, {
          title: '保存',
          defaultPath:
            (defaultPath ? defaultPath + '/' : '') + fileName + '.smm',
          filters: [{ name: '思维导图', extensions: ['smm'] }]
        })
        if (res) {
          idToFilePath[id] = res
          fs.writeFile(res, data)
          saveToRecent(res).then(() => {
            notifyMainWindowRefreshRecentFileList()
          })
          return path.parse(idToFilePath[id]).name
        }
      } else {
        fs.writeFile(idToFilePath[id], data)
      }
    }
  )

  // 打开文件
  const openFile = (event, file) => {
    // 检查文件是否存在
    const exist = fs.existsSync(file)
    if (!exist) {
      removeFileInRecent(file).then(() => {
        notifyMainWindowRefreshRecentFileList()
      })
      return '文件不存在'
    }
    // 检查该文件是否已经打开
    const existId = Object.keys(idToFilePath).find(item => {
      return idToFilePath[item] === file
    })
    if (openIds.includes(existId)) {
      // 将已打开的窗口移至顶端
      if (openIdToWin[existId]) {
        openIdToWin[existId].moveTop()
      }
      return
    }
    let id = uuid()
    idToFilePath[id] = file
    saveToRecent(file).then(() => {
      notifyMainWindowRefreshRecentFileList()
    })
    createEditWindow(null, id)
  }
  ipcMain.handle('openFile', openFile)

  // 选择打开本地文件
  ipcMain.handle('selectOpenFile', event => {
    const res = dialog.showOpenDialogSync({
      title: '选择',
      filters: [{ name: '思维导图', extensions: ['smm'] }]
    })
    if (res && res[0]) {
      openFile(null, res[0])
      return res[0]
    } else {
      return null
    }
  })

  // 选择目录
  ipcMain.handle('selectOpenFolder', event => {
    const res = dialog.showOpenDialogSync({
      title: '选择',
      properties: ['openDirectory']
    })
    if (res && res[0]) {
      return res[0]
    } else {
      return null
    }
  })

  // 获取指定目录下指定类型的文件列表
  ipcMain.handle('getFilesInDir', (event, dir, ext) => {
    return new Promise((resolve, reject) => {
      fs.readdir(dir, (err, files) => {
        if (err) {
          reject(err)
        } else {
          const reg = new RegExp(ext + '$')
          files = files.filter(item => {
            return reg.test(item)
          })
          resolve(files)
        }
      })
    })
  })

  // 选择本地文件
  ipcMain.handle(
    'selectFile',
    (event, openDirectory = false, relativePath = '') => {
      const properties = ['openFile']
      // 选择目录
      if (openDirectory) {
        properties.push('openDirectory')
      }
      const res = dialog.showOpenDialogSync({
        title: '选择',
        properties
      })
      if (res && res[0]) {
        const name = path.basename(res[0])
        let file = res[0]
        if (relativePath) {
          // 如果传递了路径，那么返回相对路径
          file = path.relative(relativePath, res[0])
        }
        return {
          file,
          name
        }
      } else {
        return null
      }
    }
  )

  // 获取文件内容
  ipcMain.handle('getFileContent', (event, id) => {
    return new Promise(resolve => {
      let file = idToFilePath[id]
      if (!file) {
        resolve(null)
        return
      }
      fs.readFile(file, { encoding: 'utf-8' }, (err, data) => {
        if (err) {
          // 文件读取失败，返回null
          resolve(null)
        } else {
          resolve({
            name: path.parse(file).name,
            content: data || null
          })
        }
      })
    })
  })

  // 获取文件路径
  ipcMain.handle('getFilePath', (event, id) => {
    return idToFilePath[id]
  })

  // 重命名文件
  ipcMain.handle('rename', (event, id, name) => {
    return new Promise(resolve => {
      if (!idToFilePath[id]) {
        resolve('文件不存在')
        return
      }
      let oldPath = idToFilePath[id]
      let { base, ...oldPathData } = path.parse(oldPath)
      oldPathData.name = name
      let newPath = path.format(oldPathData)
      idToFilePath[id] = newPath
      fs.rename(oldPath, newPath, err => {
        if (err) {
          resolve('重命名失败')
        } else {
          replaceFileInRecent(oldPath, newPath).then(() => {
            notifyMainWindowRefreshRecentFileList()
            resolve()
          })
        }
      })
    })
  })

  // 获取最近文件列表
  ipcMain.handle('getRecentFileList', () => {
    return getRecent().map(item => {
      let data = path.parse(item)
      return {
        url: item,
        dir: data.dir,
        name: data.name
      }
    })
  })

  // 清空最近文件列表
  ipcMain.handle('clearRecentFileList', async () => {
    try {
      clearRecent()
      return ''
    } catch (error) {
      return '清空失败'
    }
  })

  // 从最近文件列表中删除指定文件
  ipcMain.handle('removeFileInRecent', async (event, file) => {
    try {
      removeFileInRecent(file).then(() => {
        notifyMainWindowRefreshRecentFileList()
      })
      return ''
    } catch (error) {
      return '清空失败'
    }
  })

  // 从最近文件列表中删除指定的多个文件
  ipcMain.handle('removeMultiFileInRecent', async (event, fileList) => {
    try {
      removeMultiFileInRecent(fileList).then(() => {
        notifyMainWindowRefreshRecentFileList()
      })
      return ''
    } catch (error) {
      return '删除失败'
    }
  })

  // 添加到最近文件列表
  ipcMain.handle('addRecentFileList', async (event, fileList) => {
    try {
      await saveFileListToRecent(fileList)
      notifyMainWindowRefreshRecentFileList()
    } catch (error) {
      return error
    }
  })

  // 打开指定目录
  ipcMain.handle('openFileInDir', (event, file) => {
    const exist = fs.existsSync(file)
    if (!exist) {
      removeFileInRecent(file).then(() => {
        notifyMainWindowRefreshRecentFileList()
      })
      return '文件不存在'
    }
    shell.showItemInFolder(file)
  })

  // 检查文件是否存在
  ipcMain.handle('checkFileExist', (event, filePath) => {
    return new Promise((resolve, reject) => {
      fs.access(filePath, err => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  })

  // 打开指定文件
  ipcMain.handle('openPath', (event, file, relativePath = '') => {
    if (!path.isAbsolute(file) && relativePath) {
      file = path.resolve(relativePath, file)
    }
    const exist = fs.existsSync(file)
    if (!exist) {
      return '文件不存在'
    }
    shell.openPath(file)
  })

  // 删除指定文件
  const deleteFile = async (event, file) => {
    let res = ''
    let id = Object.keys(idToFilePath).find(item => {
      return idToFilePath[item] === file
    })
    let index = -1
    if (id) {
      index = openIds.findIndex(item => {
        return item === id
      })
    }
    if (index === -1) {
      try {
        fs.rmSync(file)
      } catch (error) {}
      await removeFileInRecent(file)
    } else {
      res = '该文件正在编辑，请关闭后再试'
    }
    return res
  }
  ipcMain.handle('deleteFile', deleteFile)

  // 删除指定的多个文件
  ipcMain.handle('deleteMultiFile', (event, fileList) => {
    return new Promise(resolve => {
      const total = fileList.length
      let count = 0
      const failList = []
      fileList.forEach(item => {
        const error = deleteFile(null, item)
        count++
        if (error) {
          failList.push(item)
        }
        if (count >= total) {
          resolve(failList)
        }
      })
    })
  })

  // 复制文件
  ipcMain.handle('copyFile', async (event, file) => {
    return new Promise((resolve, reject) => {
      fs.pathExists(file, (err, exists) => {
        if (err) {
          removeFileInRecent(file).then(() => {
            notifyMainWindowRefreshRecentFileList()
          })
          resolve('文件不存在')
        } else {
          if (exists) {
            let { base, ...oldPathData } = path.parse(file)
            let newName = oldPathData.name + '-复制'
            let index = 1
            oldPathData.name = newName
            let newPath = path.format(oldPathData)
            // 检查新路径是否已存在
            while (fs.pathExistsSync(newPath)) {
              oldPathData.name = newName + index
              newPath = path.format(oldPathData)
              index++
            }
            fs.copy(file, newPath, err => {
              if (err) {
                resolve('复制出错')
              } else {
                saveToRecent(newPath).then(() => {
                  notifyMainWindowRefreshRecentFileList()
                })
                resolve()
              }
            })
          } else {
            removeFileInRecent(file).then(() => {
              notifyMainWindowRefreshRecentFileList()
            })
            resolve('文件不存在')
          }
        }
      })
    })
  })

  return {
    openFile
  }
}
