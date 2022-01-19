let NengeApp = new class {
    Module = {};
    CoreFile = "/wasm/vbanext-wasm.7z";
    Core7z = "/js/extract7z.min.js";
    CoreZip = "/js/jszip.js";
    CoreRar = "/js/libunrar.js";
    CoreRarMem = "/js/libunrar.js.mem";
    OnLine = document.domain.search(/localhost|127.0./g) !== -1;
    FILE_INPUT = document.createElement('input');
    stateKey = 0;
    runMusic = false;
    constructor() {
        this.FILE_INPUT.type = 'file';
        this.setConfig();
        this.initDB();
        this.EVENT();
        return;
    }
    async installCore(result) {
        let File = result.file,
            cfg = File.cfg,
            Module = {
                'TOTAL_MEMORY': 0x10000000,
                'noInitialRun': !0x0,
                'SRM_POS': 658768,
                'SRM_LEN': 131072,
                'SRM_XLEN':139264,
                'ROOM_POS': 6647264,
                'STATE_POST': 8787512,
                'CanvasWidth':600,
                'CanvasHeight':400,
                'MusicNeedRun':false,
                'arguments': [],
                'preRun': [],
                'postRun': [e=>console.log(e)],
                'canvas': document.querySelector('.gba-pic'),
                'print': e => console.log(e),
                'printErr': e => console.warn(e),
                'totalDependencies': 0,
                'monitorRunDependencies': e => console.log("屏幕初始化"),
                'onRuntimeInitialized': e => {
                    console.log('就绪!加载游戏!');
                    Module.wasmBinary = null;
                    this.GameName = result.gbaname;
                    this.CoreGBA = result.gbaname;
                    /**
                     * room文件储存在 HEAPU8[6647264+room.length]
                     * 游戏缓冲区 HEAPU8[6647264+room.length-32,+room.length]
                     * 存档文件 HEAPU8[6664752 + 131072]
                     * 存档 缓存区 HEAPU8[658768,658768+131072]
                     * 即时存档 长度 733688
                     * 
                     */
                    //Module.HEAPU8.set(Module.HEAPU8.subarray(6647264, 6647264 + 16777216), 23424512)
                    //fetch('/rooms/test.gba').then(v=>v.arrayBuffer()).then(v=>{result.gba = new Uint8Array(v);this.GameName = 'test.gba';
                    //Module['FS']['createDataFile']('/', 'game.gba', result.gba, !0x0, !0x1);

                    Module['ROOM_POS'] += result.gba.length + 32;
                    this.DATA.AddROOM(result.gba,true,result.srm);
                    //this.DATA.AddSRM(result.srm,true);
                    Module['callMain'](['/game.gba', '2b35cacf70aef5cbb3f38c0bb20e488cc8ad0c350400499a3']);
                    Module['FS']['unlink']('/game.gba');
                    Module['FS']['unlink']('/game.srm');
                    if(result.state){
                        this.DATA.STATE = result.state;
                    }
                    delete result.state;
                    delete result.srm;
                    delete result.gba;
                    result = null;
                    EmulatorJS = null;
                    //});

                },
                preMainLoop:e=>{
                    if(this.GAMEPAD_OPEN){
                        this.GAMEPAD_EVENT_RUN()
                    }
                },
                'wasmBinary': File['wasmdata'] && new Uint8Array(File['wasmdata'])
            };
        EmulatorJS(Module);
            Module['FS']['createFolder']('/', 'etc', !0x0, !0x0),
            Module['FS']['mkdir']('/data'),
            Module['FS']['mkdir']('/config'),
            Module['FS']['mkdir']('/system'),
            Module['FS']['mkdir']('/data/saves'),
            Module['FS']['mkdir']('/srm'),
            Module['FS']['mkdir']('/shader'),
            Module['FS']['syncfs'](!0x0, function (e) {}),
            Module['FS']['createFolder']('/home/web_user', '.config', !0x0, !0x0),
            Module['FS']['createFolder']('/home/web_user/.config', 'retroarch', !0x0, !0x0),
            Module.runMusic = this.runMusic || false;
        for (let dir in cfg) {
            if (cfg[dir]) Module['FS']['writeFile'](dir, cfg[dir]);
        }
        window.Module = this.Module = Module;
        File = null;
    }
    AddJs(URL, cb) {
        let elm = document.createElement('script');
        elm.src = URL;
        if (cb) elm.onload = cb;
        document.body.appendChild(elm);
    }
    btnMap = {
        'startmusic': e => {
            this.Module.startMusic();
            let msg = document.querySelector('.gba-msg');
            msg.innerHTML = '';
            msg.style.display = 'none';
            msg = null;
        },
        'do': {
            'settings': e => {
                this.btnMap['SetMenu'](1);
            },
            'reset': e => {
                if (!this.Module || !this.Module.noExitRuntime) return;
                this.Module['cwrap']('system_restart', '', [])();
                this.btnMap['SetMenu'](0);
            },
            'loadstate': buf => {
                if (!this.Module || !this.Module.noExitRuntime) return;
                let readbuf = state => {
                    this.DATA.STATE = state;
                    readbuf = null, state = null;

                };
                if (buf && buf instanceof Uint8Array) readbuf(buf);
                else this.STATE.get(this.GameName).then(result => {
                    let state = result['state' + this.stateKey];
                    if (state) readbuf(state);
                });
                this.btnMap['SetMenu'](0);

            },
            'savestate': e => {
                if (!this.Module || !this.Module.noExitRuntime) return;
                let data = {};
                data['name'] = this.GameName;
                data['state' + this.stateKey] = this.DATA.STATE;
                data['stateimg' + this.stateKey] = this.DATA.SCREEN;
                data['statetime' + this.stateKey] = new Date();
                this.btnMap['SetMenu'](0);
                this.STATE.update(this.GameName, data, this.GameName).then(
                    e => {
                        if (!e) {
                            this.STATE.put(data).then(result => {
                                console.log(result);
                                data = null;
                            });
                        } else {
                            data = null;
                        }
                        this.Module.FS.unlink('screenshot.png');
                    }
                );
            },
            'upsrm': e => {
                if (!this.Module || !this.Module.noExitRuntime) return;
                this.btnMap['SetMenu'](0);
                this.upload(result => {
                    this.CheckFile(result, cb => {
                        if (cb instanceof Uint8Array && (cb.length == 139264 || cb.length == 1024 * 128)) {
                            this.DATA.AddSRM(cb);
                        }
                    })
                })

            },
            'downsrm': e => {
                if (!this.Module || !this.Module.noExitRuntime) return;
                this.btnMap['SetMenu'](0);
                this.download(this.DATA.SRM, this.GetName('srm'));
            },
            'upstate': e => {
                if (!this.Module || !this.Module.noExitRuntime) return;
                this.btnMap['SetMenu'](0);
                this.upload(result => {
                    this.CheckFile(result, cb => {
                        if (cb instanceof Uint8Array) {
                            this.DATA.STATE = cb;
                            cb=null;
                        }
                    })
                })

            },
            'downstate': e => {
                if (!this.Module || !this.Module.noExitRuntime) return;
                this.btnMap['SetMenu'](0);
                this.download(this.DATA.STATE,this.GetName('state'));

            },
            'music': e => {
                this.setConfig({
                    "runMusic": this.runMusic == true ? false : true
                });
                this.btnMap['SetMenu'](0);
                return location.reload();
            },
            'cheat': async e => {
                let HTML = '<div><textarea style="width: 100%;height: 500px;" class="gba-cheats">',
                    data = await this.ROOMS.get(this.DBKeyName);
                if (data && data.cheat) {
                    HTML += data.cheat;
                }
                let ctrl = '<button type="button" data-btn="cheat-run">启用</button> | <button type="button" data-btn="cheat-save">保存并启用</button> | <button type="button" data-btn="cheat-stop">暂停</button>';
                HTML += '</textarea></div>';
                this.RESULT(ctrl+ HTML + ctrl);
                this.btnMap['SetMenu'](0);
            },
            'forward': () => {
                if (!this.Module || !this.Module.noExitRuntime) return;
                //if(e.type != 'pointerdown') return;
                let e = document.querySelector('[data-btn=do-forward]');
                    e.classList.toggle('active');
                    this.Module['cwrap']('fast_forward', 'number', ['number'])(e.classList.contains('active')?1:0);
                    this.btnMap['SetMenu'](0);
            },
            'switch':e=>{
                let elm = document.querySelector('.gba-msg');
                this.setConfig({
                    stateKey:++this.stateKey%5
                });
                elm.innerHTML = `<input value="当前即时存档位置为:${this.stateKey}" type="button" data-btn="">`;
                document.getElementsByName('state')[this.stateKey].checked = "checked";
                elm.style.display = '';
                setTimeout(()=>{
                    elm.style.display = 'none';
                },1000);
            },
            'downscreen':e=>{
                this.download(this.DATA.SCREEN,this.GetName('png'));
                this.btnMap['closemenu']();
            },
            'shader':e=>{
                if(e&&e.target)e.target.classList.toggle('active');
                this.DATA.SHADER = [];
                document.querySelectorAll('[data-btn="do-shader"]').forEach(
                    val=>{
                        if(val.classList.contains('active'))this.DATA.SHADER.push(val.getAttribute('data-sharder'));
                    }
                );
                this.DATA.SetShader();
                this.btnMap['closemenu']();
            },
            'fanyi':e=>{
                /**
                 * <script type="text/javascript">
var appid = '20220119001059108';
var key = '6ANW8_VFJP_VYlGiKZhp';
var salt = (new Date).getTime();
var query = 'apple';
// 多个query可以用\n连接  如 query='apple\norange\nbanana\npear'
var from = 'en';
var to = 'zh';
var str1 = appid + query + salt +key;
var sign = MD5(str1);
$.ajax({
    url: 'http://api.fanyi.baidu.com/api/trans/vip/translate',
    type: 'get',
    dataType: 'jsonp',
    data: {
        q: query,
        appid: appid,
        salt: salt,
        from: from,
        to: to,
        sign: sign
    },
    success: function (data) {
        console.log(data);
    } 
});

                 */
                let img64 = window.btoa(String.fromCharCode.apply(null,this.DATA.SCREEN)),
                    p = new FormData(),
                    str = 'Action=ImageTranslate&SessionUuid=session-00001&Scene=doc&Source=auto&Target=zh&ProjectId=0&Version=2018-03-21'.split('&');
                    for(let i=0;i<str.length;i++){
                        let s = str[i].split('=');
                        //p.append(s[0],s[1]);
                    }
                    p.append('image',img64);
                    //'http://ztranslate.net/service?api_key=E4F1GW8S3D&target_lang=Zh&source_lang=En&mode=Fast&output=txt'
                    // JSON.stringify({image:img64})
                fetch(
                    new Request('http://ztranslate.net/service?api_key=E4F1GW8S3D&target_lang=Zh&source_lang=En&mode=Fast&output=txt', {
                        'method':'POST',
                        'headers': {
                            //'Content-Type':'multipart/formdata'
                        },
                        'body': JSON.stringify({image:img64})
                    })).then(v=>v.json()).then(
                        v=>{
                            this.MSG('<img src="data:image/jpeg;base64,'+v.image+'">',true)
                        }
                    ).catch(e=>{
                        alert('很遗憾!翻译功能要跨域!');
                    });
                //https://tmt.tencentcloudapi.com/?Action=ImageTranslate&SessionUuid=session-00001&Scene=doc&Source=zh&Target=en&ProjectId=0

            }
        },
        'cheat':{
            'run':e=>{
                let cheat = document.querySelector('.gba-cheats').value.split('\n'),
                    code = [];
                for (let i = 0; i < cheat.length; i++) {
                    if (cheat[i].indexOf('-') !== 0 && cheat[i].indexOf('#') !== 0) code.push(cheat[i].trim());
                }
                this.Module._reset_cheat();
                this.Module['cwrap']('set_cheat', 'number', ['number', 'number', 'string'])(0, 1, code.join('\\n'));
            },
            stop:e=>{
                this.Module._reset_cheat();
            },
            'save': async e => {
                this.ROOMS.update(this.DBKeyName, {
                    cheat:document.querySelector('.gba-cheats').value
                }).then(
                    result=>{
                        this.btnMap['cheat']['run']();
                    }
                );
            },
        },
        'db': {
            'rooms': async e => {
                let HTML = '';
                this.btnMap['SetMenu'](0);
                await this.ROOMS.orderBy('time').reverse().each(data => {
                    HTML += `<div><h3>${data.name}</h3><img src="data:image/jpeg;base64,${window.btoa(String.fromCharCode.apply(null,data.img||[0]))}"><p>${data.gbaname}</p><p>${data.time.toLocaleString()}</p><button type="button" data-btn="db-loadrooms" data-name="${data.name}">加载</button> | <button type="button" data-btn="db-deleterooms" data-name="${data.name}">删除</button> | <button type="button" data-btn="db-downrooms" data-name="${data.name}">下载</button></div>`;
                });
                this.RESULT('<p><button type="button" data-btn="db-uploadrooms">上传gba</button><br>vbanext-wasm.7z 为运行核心文件,不可删除!</p><div class="gba-result-rooms">' + HTML + '</div>');

            },
            'state': async e => {
                if (!this.Module || !this.Module.noExitRuntime) return alert('模拟器必须先启动!');
                this.btnMap['SetMenu'](0);
                let HTML = '',
                    key = 'state';
                let states = await this.STATE.get(this.GameName);
                if (states) {
                    for (let index = 0; index < 5; index++) {
                        if (states[key + index]) {
                            HTML += `<div><h3>${states.name}</h3><img src="data:image/jpeg;base64,${window.btoa(String.fromCharCode.apply(null,states[key+'img'+index]||[0]))}"><p>存档位置:${index}</p><p>${states[key+'time'+index].toLocaleString()}</p><button type="button" data-btn="db-loadstate" data-index="${index}">读取</button> | <button type="button" data-btn="db-downstate" data-index="${index}">下载</button></div>`;
                        }
                    }
                }
                this.RESULT('<div class="gba-result-rooms">' + HTML + '</div>');
            },
            'loadrooms': Name => {
                if (!this.Module || !this.Module.noExitRuntime) return alert('模拟器必须先启动!');
                if (Name && Name.target) {
                    Name = Name.target, Name = Name.getAttribute('data-name');
                }
                if (!Name) return;
                ///this.btnMap['db']['SetRoom']();
                this.btnMap['db']['GetRoom'](Name);
            },
            'deleterooms': e => {
                let elm = e.target,
                    name = elm.getAttribute('data-name');
                this.ROOMS.delete(name).then(result => {
                    console.log(result);
                    this.btnMap['db']['rooms']();
                });

            },
            'downrooms':e=>{
                let elm = e.target,
                    name = elm.getAttribute('data-name');
                    if(name == "vbanext-wasm.7z") location.href = "https://github.com/nenge123/vba_next_wasm";
                    this.ROOMS.get({'name':name}).then(result => {
                        if(result.gba)this.download(result.gba,result.gbaname);
                        if(result.srm)this.download(result.srm,result.gbaname.replace('.gba','.srm'));
                        if(result.state)this.download(result.state,result.gbaname.replace('.gba','.state'));
                        //this.btnMap['closelist']();
                    });
            },
            'saverooms':e=>{
                this.btnMap['db']['SetRoom'](update=>{
                    this.btnMap['closemenu']();
                    this.MSG('<button data-btn="">'+(update?'储存成功':'存储失败!')+'</button>');
                });
            },
            'SetRoom': cb => {
                if (!this.Module || !this.Module.noExitRuntime) return alert('模拟器必须先启动!');
                this.ROOMS.update(this.DBKeyName, {
                    state: new Uint8Array(this.DATA.STATE) ,
                    img: new Uint8Array(this.DATA.SCREEN),
                    srm: new Uint8Array(this.DATA.SRM),
                }).then(update => {
                    console.log(update?'储存成功':'存储失败!');
                    cb&&cb(update);
                });

            },
            'GetRoom':name=>{
                this.ROOMS.get({'name':name}).then(result => {
                    this.GameName = result.gbaname;
                    this.DATA.AddROOM(result.gba,false, result.srm,result.state);
                    this.btnMap['closelist']();
                });

            },
            'uploadrooms': async e => {
                this.upload((result, name) => {
                    this.CheckFile(result, (file, notgba) => {
                        if (notgba) return;
                        let func = (n, buf) => {
                            this.ROOMS.put({
                                name: n,
                                gba: buf,
                                gbaname: n,
                                time: new Date()
                            }).then(result2 => {
                                console.log(result2);
                                if (file[n]) {
                                    delete file[n];
                                    for (let j in file);
                                    if (typeof j == 'undefined') {
                                        file = null, func = null;
                                        this.btnMap['db']['rooms']();
                                    }
                                }
                            })
                        };
                        for (var i in file) {
                            func(i, file[i]);
                        }
                    }, name);
                });
            },
            'downstate': e => {
                if (!this.Module || !this.Module.noExitRuntime) return alert('模拟器必须先启动!');
                let elm = e.target,
                    index = elm.getAttribute('data-index');
                this.STATE.get(this.GameName).then(
                    result => {
                        let state = result['state' + index];
                        if (state) {
                            this.download(state, this.GetName('state'));
                            state = null;
                        }
                    }
                )

            },
            'loadstate': e => {
                if (!this.Module || !this.Module.noExitRuntime) return alert('模拟器必须先启动!');
                let elm = e.target,
                    index = elm.getAttribute('data-index');
                    this.STATE.get(this.GameName).then(
                    result => {
                        if(!result) return;
                        let state = result['state' + index];
                        if (state) {
                            this.DATA.STATE = state;
                            state = null;
                        }
                        this.btnMap['closelist']();
                    }
                )
            }
        },
        'closelist': e => {
            document.querySelector('.gba-list').style.cssText = '';
        },
        'openlist': e => {
            document.querySelector('.gba-list').style.cssText = 'top:0px';
            this.btnMap['SetMenu'](0);
        },
        'closemenu': e => {
            this.btnMap['SetMenu'](0);
        },
        'SetMenu': e => {
            document.querySelector('.gba-action').style.cssText = e?'top:10%':'';
        }
    }
    RESULT(html){
        let result = document.querySelector('.gba-result');
        result.innerHTML = html;
        this.btnMap['openlist']();
        result = null;
    }
    MSG(str,bool){
        let msg = document.querySelector('.gba-msg');
        msg.innerHTML = str;
        msg.style.display = '';
        if(!bool){
            clearTimeout(this.Timer.msg);
            this.Timer.msg = setTimeout(()=>{
                msg.style.display = "none";
                msg = null;
            },1500)
        }else msg = null;
    }
    upload(cb) {
        this.FILE_INPUT.onchange = E => {
            let file = E.target.files[0];
            if (!file) return;
            let reader = new FileReader();
            reader.onload = e => {
                cb && cb(e.target.result, file.name);
                this.FILE_INPUT.value = null;
                reader = null, file = null;
            };
            reader.readAsArrayBuffer(file);
        }
        this.FILE_INPUT.click();

    }
    download(buf, name) {
        let a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([buf], {
            type: 'application/octet-stream'
        }));
        a.download = name || this.GameName;
        a.click();
        a = null;
    }
    DATA = new class{
        constructor(N){
            this.M = N;
        }
        get Module(){
            return this.M.Module;
        }
        get cwrap(){
            return this.M.Module.cwrap;
        }
        get FS(){
            return this.M.Module.FS;
        }
        get HEAPU8(){
            return this.M.Module.HEAPU8;
        }
        get STATE(){
            let len = this.cwrap('get_state_info', 'string', [])().split('|');
            if(!len[1]) return null;
            return new Uint8Array(this.HEAPU8.subarray(len[1]>>0,(len[0]>>0)+(len[1]>>0)));
        }
        set STATE(state){
            this.FS['writeFile']('/game.state', state);
            this.cwrap('load_state', 'number', ['string', 'number'])('game.state', 0);
            this.FS.unlink('/game.state');
            state = null;
        }
        get SRM() {
            //this.cwrap('cmd_savefiles','','')();
            //let buf = 
            //return this.FS.readFile('/game.');
            return new Uint8Array(this.HEAPU8.subarray(this.Module.SRM_POS, this.Module.SRM_POS + 139264));
            //this.FS['unlink']('/game.');

        }
        set SRM(buf) {
            this.HEAPU8.set(buf?new Uint8Array(buf):new Uint8Array(139264),this.Module.SRM_POS);
        }
        get SCREEN() {
            //this.ShaderEnable(0);
            this.cwrap('cmd_take_screenshot', '', [])();
            //this.ShaderEnable();
            return this.FS.readFile('screenshot.png');
        }
        AddROOM(u8,isFile,srm,state){
            if(isFile){
                this.FS['createDataFile']('/', 'game.gba',new Uint8Array(u8), !0x0, !0x1);
                this.AddSRM(srm,isFile);
            }else{
                this.Module.pauseMainLoop();
                this.HEAPU8.set(new Uint8Array(u8), this.Module["ROOM_POS"]);
                this.AddSRM(srm,isFile,state);
            }
            u8=null;
        }
        AddSRM(buf,isFile,state){
            if(isFile){
                this.FS.createDataFile('/', 'game.srm',buf ? new Uint8Array(buf):new Uint8Array(139264), !0x0, !0x1);
                buf = null;
            }else {
                if(!state)this.HEAPU8.set(buf?new Uint8Array(buf):new Uint8Array(139264),this.Module.SRM_POS);
                this.Module._system_restart();
                if(state)this.STATE = new Uint8Array(state);
                this.Module.resumeMainLoop();
            };
            buf = null,state=null;
        }
        SHADER = [];
        SHADER_MODE = {
            "2xScaleHQ.glsl":['false','source'],
            "4xScaleHQ.glsl":['false','source'],
            "crt-aperture.glsl":['false','source'],
            "crt-easymode.glsl":['false','source'],
            "crt-geom.glsl":['false','source']
        }
        SetShader(){
            let str = 'shaders = ' + this.SHADER.length+'\n';
            for(let i = 0;i<this.SHADER.length;i++){
                let shader = this.SHADER[i];
                str +=  `shader${i} = "${shader}"\n`
                        +`filter_linear${i} = ${this.SHADER_MODE[shader][1]}\n`
                        +`scale_type_${i} = ${this.SHADER_MODE[shader][2]}\n`;
            }
            this.FS.writeFile('/shader/shader.glslp',str);
            this.ShaderEnable(this.SHADER.length>0?1:0);
        }
        ShaderEnable(NUM){
            if(NUM == undefined)NUM = this.SHADER.length>0 ? 1:0;
            this.cwrap('shader_enable', 'null', ['number'])(NUM);
        }
        async LoadRomm(str){
            let f = await fetch('/rooms/' + str),buf = await f.arrayBuffer();
                this.GameName = str.split('/').pop();
                this.AddROOM(buf);
        }
    }(this);
    GetName(str) {
        if (!this.GameName) this.GameName = '未知游戏.gba';
        if (!/\.gba$/.test(this.GameName)) this.GameName += '.gba';
        return str ? this.GameName.replace('.gba', '.' + str) : this.GameName;
    }
    get DBKeyName() {
        return this.GameName == this.CoreGBA ? this.CoreFile.split('/').pop() : this.GameName
    }
    async initDB() {
        const DB = new Dexie('NengeNet_VBA-Next');
        DB.version(1).stores({
            'ROOMS': '&name,file,gba,gbaname,img,state,srm,time',
            'STATE': '&name,state0,state1,state2,state3,state4,stateimg0,stateimg1,stateimg2,stateimg3,stateimg4,statetime0,statetime1,statetime2,statetime3,statetime4',
        });
        this.ROOMS = DB['ROOMS'],
            this.STATE = DB['STATE'];
        let CoreFile = this.CoreFile.split('/').pop(),
            CoreData = await this.ROOMS.get({
                name: CoreFile
            });
        if (CoreData) {
            console.log(CoreData.time.toLocaleString());
            this.installCore(CoreData);
        } else {
            this.fetch(this.CoreFile, result => {
                let decode = str => new TextDecoder().decode(str),
                    untype = ['js', 'cfg', 'glsl', 'glslp'],
                    data = {
                        file: {
                            cfg: {}
                        },
                        name: CoreFile
                    };
                for (var i in result) {
                    let t = i.split('.').pop();
                    if (untype.includes(t)) {
                        if (i == 'retroarch.js') data.file.wasmjs = decode(result[i]);
                        else data.file.cfg[i] = decode(result[i]);
                        delete result[i];
                    } else if (i == 'retroarch.wasm') {
                        data.file.wasmdata = new Uint8Array(result[i]);
                    } else if (i == 'retroarch.js.mem') {
                        data.file.memdata = new Uint8Array(result[i]);
                    } else if (t == 'gba') {
                        data.gba = new Uint8Array(result[i]);
                        data.gbaname = i;
                    } else if (i == 'icon.png') {
                        data.img = new Uint8Array(result[i]);
                    }
                    delete result[i];
                }
                result = null;
                data.time = new Date();
                this.ROOMS.put(data);
                this.installCore(data);
            })
        }
    }
    async fetch(file, cb) {
        let f = await fetch(file),
            buf = await f.arrayBuffer();
        this.CheckFile(buf, cb);
    }
    CheckFile(u8, cb, name) {
        u8 = new Uint8Array(u8);
        let HEAD = (Array.from(u8.subarray(0, 4)).map(item => {
            return (item < 16 ? '0' : '') + item.toString(16);
        })).join("").toUpperCase();
        console.log(HEAD);
        if (this.CheckFile_HEAD[HEAD]) return this.CheckFile_HEAD[HEAD].apply(this, arguments);
        else return cb(u8, true);
    }
    CheckFile_HEAD = {
        "7F0000EA": (u8, cb, name) => {
            let data = {};
            data[name] = new Uint8Array(u8);
            cb(data);
            u8 = null;
        },
        "504B0304": (u8, cb) => {
            //zip
            return alert('zip稍后测试');
            if (typeof self.JSZip == 'undefined') importScripts("JSZip.js");
            self.JSZip.loadAsync(u8).then(ZipFile => {
                let READ_ZIP = file => {
                    ZipFile.file(file).async("uint8array").then(u8 => {
                        this.LOAD_FILE(u8, file, true);
                    });
                };
                let files = [];
                for (let File in ZipFile.files) {
                    if (ZipFile.files[File].dir) continue;
                    READ_ZIP(File);
                    files.push(File);
                }
                this.MSG('你上传了一个压缩文件.含有：<br>' + files.join('<br>'));
            });
        },
        "52617221": (u8, GameName, isZIP, password) => {
            //rar
            return alert('rar稍后测试');
            let worker = new Worker("libunrar.js");
            worker.onmessage = (e) => {
                if (e.data && e.data.ls) {
                    let files = e.data.ls,
                        fileArr = [];
                    for (let FileID in files) {
                        let file = files[FileID];
                        if (file.type == "file") {
                            this.LOAD_FILE(file.fileContent, FileID, true);
                            fileArr.push(FileID);
                        }
                    }
                    this.MSG('你上传了一个压缩文件.含有：<br>' + fileArr.join('<br>'));
                }
                worker.terminate();
                worker = null;
            };
            worker.onerror = e => {
                worker.terminate();
                worker = null;
            };
            worker.postMessage({
                "data": [{
                    "name": GameName,
                    "content": u8
                }],
                password
            });
        },
        "377ABCAF": (u8, cb) => {
            this.un7z(u8, cb)
        }

    };
    un7z(buf, cb) {
        let func = async ok => {
            let w = new Worker(this.Core7z),
                F = {};
            w.onmessage = e => {
                if (e.data.data) {
                    F[e.data.file] = e.data.data;
                } else if (e.data.t == 1) {
                    ok(F);
                }
            };
            w.postMessage(new Uint8Array(buf));
            buf = null;
            return F;
        };
        if (cb) {
            func(cb);
        } else {
            return new Promise((ok, erro) => {
                func(ok)
            });
        }
    }
    setConfig(data) {
        let config = localStorage.getItem('vba-next-config');
        config = config ? JSON.parse(config) : {};
        if (data) {
            for (let j in data) {
                config[j] = data[j]
            }
            localStorage.setItem('vba-next-config', JSON.stringify(config));
        }
        for (let i in config) {
            this[i] = config[i];
        }
        document.getElementsByName('state').forEach(val => {
            if (val.value == this['stateKey']) {
                val.checked = true;
            }else{
                val.checked = false;
            }
            if(!val.c){
                val.onchange = e => {
                    let v = e.target.value;
                    this.setConfig({
                        'stateKey': parseInt(v)
                    });
                };
                val.c=true;
            }
        });
    }
    checkCheat(value) {
        value = value.split('\n');
        let arr = [];
        for (let i = 0; i < value.length; i++) {
            let code = value[i].trim();
            if (code.indexOf('--' == 0)) arr.push(code);
            else {
                if (/^\w+$/.test(code)) {
                    if (code.length == 16 || code.length == 12) arr.push(code);
                    else arr.push('--' + code);
                } else {
                    //space
                    let newCode = '';
                    for (let j = 0; j < code.length; j++) {
                        if (code.chartAt(j) != '' && code.chartAt(j) != '\t') newCode = code.chartAt(j);
                    }
                    if (newCode.length == 16 || newCode.length == 12) arr.push(code);
                }
            }
        }
    }
    GAMEPAD_EVENT() {
            this.GAMEPAD_EVENT_RUN = () => {
                if (!this.Module || !this.Module.noExitRuntime) return;
                let GamePads = navigator.getGamepads(),keyState;
                for (let GamePadId = 0; GamePadId < GamePads.length; GamePadId++) {
                    let Gamepad = GamePads[GamePadId];
                    if (Gamepad && Gamepad.connected) {
                        let AXE = Gamepad.axes,
                            Buttons = Gamepad.buttons;
                        //connected = Gamepad.connected,
                        //GamepadName = Gamepad.id;
                        for (let btnid = 0; btnid < Buttons.length; btnid++) {
                            //12上 13下 14 左 15右
                            //L1/4  R1/5  L2/6 L3/7   L/10 R11
                            //0 X 1 O 2 ▲ 3 SHARE 8 option 9 PS 16 触摸板按下17
                            //value 越大压力越强
                                let MapTemp = this.KEY.KeyGamePad[btnid];                                    
                                if(typeof MapTemp == 'number'){
                                    if(Buttons[btnid].value > 0.5){
                                        if(!keyState)keyState = {};
                                        keyState[MapTemp] = 1;
                                    }
                                }else if(Buttons[btnid].value > 0.8){
                                    if(typeof MapTemp == 'string'&&this.btnMap['do'][MapTemp]){
                                    clearTimeout(this.Timer[MapTemp]);
                                    this.Timer[MapTemp] = setTimeout(
                                        ()=>{
                                            this.btnMap['do'][MapTemp]();
                                        },
                                        ['forward','switch'].includes(MapTemp)?500:1
                                    )}
                                }
                        }
                        for (let axeid = 0; axeid < AXE.length; axeid++) {
                            let axe = parseFloat(AXE[axeid]),
                                axeS = 0;
                            //1 左摇杆 左右 2 上下 3右摇杆 左右 上下
                            //key 4右 5左  6上 7下
                            if (axe < -0.5) axeS += 1; //1 or0
                            if (axe > 0.5) axeS += 2; //2 or 0
                            //axeS1左 上 axeS2右 下
                            //axeid%2 0左右
                            //axeid%2 1上下
                            if (axeS != 0) {
                                if (axeid % 2 == 0) {
                                    
                                    if(!keyState)keyState = {};
                                   axeS+5==6 ? (keyState[6]=1) :(keyState[7]=1)
                                    //console.log(axeS+5);
                                } else if (axeid % 2 == 1) {
                                    
                                    if(!keyState)keyState = {};
                                    axeS+3==4?(keyState[4]=1):(keyState[5]=1)
                                    //console.log(axeS+3);
                                    //上下
                                }
                            }
                        }
                    }
                }
                if(keyState){
                    this.KEY.SetState(keyState);
                    this.Timer.gamepad = keyState;
                }else if(this.Timer.gamepad){
                    this.Timer.gamepad = null;
                    this.KEY.SetState({});
                }
                keyState = null;
            };
        window.addEventListener("gamepadconnected", e => {
            console.log("连接手柄", e.gamepad.id);
            this.GAMEPAD_OPEN = true;
        });
        window.addEventListener('gamepaddisconnected', e => {
            console.log("断开手柄", e.gamepad.id);
            let GamePads = navigator.getGamepads();
            if (GamePads) {
                for (var i in GamePads) {
                    if (GamePads[i].connected) return;
                }
            }
            this.GAMEPAD_OPEN = false;
        });
    }
    ELM_ATTR = (elm,key)=>getAttribute&&elm.getAttribute(key);
    stopEvent(e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    }
    Timer = {};
    EVENT() {
        this.KEY.init();
        this.GAMEPAD_EVENT();
        let ETYPE = ['mousedown','mouseup', 'mouseout'];
        if ("ontouchstart" in document){
            ETYPE = ['touchstart', 'touchmove', 'touchcancel', 'touchend'];
        }
        ETYPE.forEach(val=>document.addEventListener(val,(event)=>{
            let elm = event.target,keyState={},
                type = event.type,
                key = elm.getAttribute('data-k'),
                btn = elm.getAttribute('data-btn');
            if(btn){
                if(["mouseup","touchend"].includes(type)){
                    btn = btn.toLowerCase();
                    let btnkey = btn.split('-');
                    if (btnkey[1]) this.btnMap[btnkey[0]][btnkey[1]](event);
                    else this.btnMap[btn](event);
                }
                return this.stopEvent(event);
            }else if(key){
                if (event.touches && event.touches.length > 0) {
                    for (var i = 0; i < event.touches.length; i++) {
                        var t = event.touches[i];
                        var k = document.elementFromPoint(t.pageX, t.pageY).getAttribute('data-k');
                        if (k) {
                            let index = this.KEY.get(k);
                            if (index != undefined) {
                                keyState[index] = 1;
                            } else {
                                if (k == 'ul') {
                                    keyState[4] = 1;
                                    keyState[6] = 1;
                                } else if (k == 'ur') {
                                    keyState[4] = 1;
                                    keyState[6] = 1;
                                } else if (k == 'dl') {
                                    keyState[5] = 1;
                                    keyState[7] = 1;
                                } else if (k == 'dr') {
                                    keyState[5] = 1;
                                    keyState[7] = 1;
                                }
                            }
                        }
                    }
                }else if(type=='mousedown'){
                    keyState[this.KEY.get(key)] = 1;
                    this.KEY.SetState(keyState);
                    return this.stopEvent(event);
                } 
            }
            this.KEY.SetState(keyState);
        },{
            'passive': false
        }));
        
        ['keyup', 'keydown'].forEach(val => document.addEventListener(val, (e)=>{
            let code = this.KEY._KeyCode[e.code];
            if (code != undefined) {
                this.KEY.sendState(code,e.type=='keyup'?0:1);
            }
        }, {
            passive: false
        }));
        document.addEventListener('visibilitychange',()=>{
            if (!this.Module || !this.Module.noExitRuntime || Module.runMusic) return;
            if('hidden' === document['visibilityState']){
                this.Module.pauseMainLoop();
                console.log('模拟器隐藏中');
            }else{
                this.Module.resumeMainLoop();
                console.log('模拟器激活中');
            }
        },{
            passive: false
        });
    }
    KEY = {
        _NumToKey:{},
        _KeyToNum:{},
        _NumState:{},
        SetState:function(obj){
            for(let keyNum in this._NumState){
                if(obj[keyNum]){
                    this._NumState[keyNum] = 1;
                    this.sendState(keyNum,1);
                }else if(this._NumState[keyNum] !=0){
                    this._NumState[keyNum] = 0;
                    this.sendState(keyNum,0);
                }
            }
            obj = null;
        },
        clearState:function(){
            for(var i in this._NumState)this._NumState[i] = 0;
            return {};
        },
        SendKey:function(key,bool){
            key = this._KeyToNum[key.toLowerCase()];
            if(key != undefined)this.SetState(key,bool);
        },
        sendState:(key, bool)=>{
            this.Module['cwrap']('simulate_input', 'null', ['number', 'number', 'number'])(0, key, bool)},
        get:function(key){
            return this._KeyToNum[key.toLowerCase()];
        },
        init:function(){
            for(let i in this.KeyMap){
                let key = this.KeyMap[i].toLowerCase();
                this._NumToKey[i] = key;
                this._NumState[i] = 0;
                this._KeyToNum[key] = i;
            }
            this.setKeyBoard();
        },
        setKeyBoard:function(arr){
            arr = arr || this.Keyboard;
            this._KeyCode={};
            for(let i =0;i<arr.length;i++){
                let keycode = this.Keyboard[i];
                this._KeyCode[keycode] = this._KeyToNum[this.KeyboardIndex[i%10]];

            }
        },
        Keyboard:[
            "Numpad2",
            "Numpad1",
            "Numpad0",
            "NumpadDecimal",
            "ArrowRight",
            "ArrowLeft",
            "ArrowUp",
            "ArrowDown",
            "Numpad6",
            "Numpad3",
            "KeyU",
            "KeyY",
            "KeyH",
            "KeyJ",
            "KeyD",
            "KeyA",
            "KeyW",
            "KeyS",
            "KeyT",
            "KeyI",
        ],
        KeyboardIndex:["a", "b", "select", "start", "right", "left", 'up', 'down', 'r', 'l'],
        KeyGamePad:{
            0: 8, //※ A
            1: 0, //● B
            2: 2, //■ selete
            3: 3, //▲ start
            4: 'forward', //L1 LB =>L
            5: 'switch', //R1 RB =>R
            6: "loadstate", //L2 LT 加速
            7: "savestate", //R2 RT 重启
            8: null, //OPTION
            9: null, //SHARE
            10: null, //L L3
            11: null, //R R3
            12: 4, //上
            13: 5, //下
            14: 6, //左
            15: 7, //右
            16: null, //PS键
            17: null, //触摸板按下
        },
        KeyMap:{
            0: 'B',
            1: 'Y',
            2: 'SELECT',
            3: 'START',
            4: 'UP',
            5: 'DOWN',
            6: 'LEFT',
            7: 'RIGHT',
            8: 'A',
            9: 'X',
            10: 'L',
            11: 'R',
            12: 'L2',
            13: 'R2',
            14: 'L3',
            15: 'R3',
            19: 'L STICK UP',
            18: 'L STICK DOWN',
            17: 'L STICK LEFT',
            16: 'L STICK RIGHT',
            23: 'R STICK UP',
            22: 'R STICK DOWN',
            21: 'R STICK LEFT',
            20: 'R STICK RIGHT'
        }
    }
}