
var p5sl = {
    audio : document.getElementById("audio")
};

p5sl.setup = (function() {

    this.audioCtx = new AudioContext();
    this.source = this.audioCtx.createMediaElementSource(this.audio);

    this.analyser = this.audioCtx.createAnalyser();  
    
    this.analyser.fftSize = 512;

    this.source.connect(this.analyser);
    this.analyser.connect(this.audioCtx.destination);

    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    this.fft = this.frequencyData;
    
    this.smfft = [];
    for(var i = 0 ; i < 512; i ++) this.smfft.push(0.0);

}).bind(p5sl);

p5sl.update = (function(dt) {
    if(this.isLoaded == false) return;

    this.analyser.getByteFrequencyData(this.frequencyData);
    this.fft = this.frequencyData;

    for(var i = 0 ; i < 512; i ++) this.smfft[i] += (this.fft[i] / 256 - this.smfft[i]) * dt * 16.0;
}).bind(p5sl); 


class BasicCamera extends THREE.Camera{
    constructor()
    {
        super();
    }
}

class MainScene extends THREE.Scene {
    constructor(width, height)
    {
        super();

        this.time = 0.0;

        this.rendertarget = new THREE.WebGLRenderTarget(width, height, {
            minFilter : THREE.LinearFilter,
            magFilter : THREE.LinearFilter
        });
        //simbol 
        this.camera = new THREE.Camera();
        this.cam = new THREE.PerspectiveCamera(45, width / height, 1.0, 1000.0);

        this.uniforms = {
            //View Stuff
            uViewRatio : { type : "f", value : width / height},
            uBlur : { type : "f", value : 0.001},
            uTime : { type : "f", value : 0.0},

            //Camera Stuffs
            uCamPosition : { type : "3f", value : [0.0, 0.0,-3.0]},
            uCamRotation : { type : "3f", value : [0.0, 0.0, 0.0]},
            uCamFov : { type: "f", value : 45.0},

            //Object Position
            uObjectA : { type : "4f", value : [0.2, 0.2, 0.2, 0.0]},
            uObjectB : { type : "4f", value : [0.2, 0.2, 0.2, 0.0]},
            uObjectC : { type : "4f", value : [0.2, 0.2, 0.2, 0.0]},
            uObjectD : { type : "4f", value : [0.2, 0.2, 0.2, 0.0]},
            uObjectE : { type : "4f", value : [0.2, 0.2, 0.2, 0.0]},
            uObjectF : { type : "4f", value : [0.2, 0.2, 0.2, 0.0]},
        }

        this.add(new THREE.Mesh(
            new THREE.PlaneGeometry(2.0, 2.0),
            new THREE.ShaderMaterial({
                uniforms : this.uniforms,
                transparent : true,
                vertexShader : `
                varying vec2 vTex;
                void main(void) 
                {
                    vTex = uv - 0.5;
                    gl_Position = vec4(position, 1.0);
                }
                `,
                fragmentShader : `
                uniform float uViewRatio;
                uniform vec3 uCamPosition;
                uniform vec3 uCamRotation;

                uniform float uCamFov;
                uniform float uBlur;
                uniform float uTime;

                uniform vec4 uObjectA;
                uniform vec4 uObjectB;
                uniform vec4 uObjectC;
                uniform vec4 uObjectD;
                uniform vec4 uObjectE;
                uniform vec4 uObjectF;

                varying vec2 vTex;

                float rand(vec2 co){
                    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
                }

                mat4 rot2mat(vec3 rot) {
                    mat4 mx = mat4(
                        vec4(1.0, 0.0, 0.0, 0.0),
                        vec4(0.0, cos(rot.x),-sin(rot.x), 0.0),
                        vec4(0.0, sin(rot.x), cos(rot.x), 0.0),
                        vec4(0.0, 0.0, 0.0, 1.0)
                    );

                    mat4 my = mat4(
                        vec4(cos(rot.y), 0.0, sin(rot.y), 0.0),
                        vec4(0.0, 1.0, 0.0, 0.0),
                        vec4(-sin(rot.y), 0.0, cos(rot.y), 0.0),
                        vec4(0.0, 0.0, 0.0, 1.0)
                    );

                    mat4 mz = mat4(
                        vec4(cos(rot.z),-sin(rot.z), 0.0, 0.0),
                        vec4(sin(rot.z), cos(rot.z), 0.0, 0.0),
                        vec4(0.0, 0.0, 1.0, 0.0),
                        vec4(0.0, 0.0, 0.0, 1.0)
                    );

                    return mx * my * mz;
                }

                float Box(vec3 rot, vec3 pos, vec3 scl, vec3 tex, out vec3 normal, out float dep) {
                    mat4 mrot = rot2mat(rot + scl * tex * 20.0);
                    vec3 ntex = (mrot * vec4(tex - pos, 1.0)).xyz;

                    float d = 
                        smoothstep(scl.x + 0.08, scl.x - 0.08, abs(ntex.x)) * 
                        smoothstep(scl.y + 0.08, scl.y - 0.08, abs(ntex.y)) * 
                        smoothstep(scl.z + 0.08, scl.z - 0.08, abs(ntex.z));

                    vec3 retn = vec3(
                        (ntex.x) / scl.x, 
                        (ntex.y) / scl.y, 
                        (ntex.z) / scl.z);
                    
                    retn.x = pow(retn.x , 5.0);
                    retn.y = pow(retn.y , 5.0);
                    retn.z = pow(retn.z , 5.0);
                    
                    retn = (mrot * vec4(retn, 1.0)).xyz;

                    normal += normalize(retn) * d;
                    dep += d;
                    return d;
                }

                void main(void)
                {
                    mat4 rot = rot2mat(uCamRotation);
                    float fov = tan(uCamFov * 3.141592 * 0.5 / 180.0);
                    vec3 camdir = (rot * vec4(vTex.x * uViewRatio * fov, vTex.y * fov, 1.0, 1.0)).xyz;
                    vec3 ligdirA = normalize(vec3(1.0, 1.0,-2.0));
                    vec3 ligdirB = normalize(vec3(1.0, 2.0,-1.8));
                    vec3 ligdirC = normalize(vec3(2.0, 2.0,-1.0));

                    vec3 retnor = vec3(0.0, 0.0, 0.0);
                    vec3 retcol = vec3(0.0, 0.0, 0.0);
                    float retdep = 0.0;

                    //ray Marching Far to Near
                    const float near = 2.0, far = 3.5;
                    const float mid = (near + far) / 2.0;

                    float rad = rand(vTex.xy + 0.001);
                    float len = rand(vTex.yx - 0.001);
                    float x = 0.01 * len * sin(rad * 3.1415921685 * 2.0);
                    float y = 0.01 * len * cos(rad * 3.1415921685 * 2.0);
                    for(float i = near; i < far; i += 0.005)
                    {
                        vec3 currdot = uCamPosition + (camdir * i) + vec3(x, y, 0.0) * (i - mid) * 8.0 / (far - near);
                        vec3 color = vec3(0.0);
                        vec3 normal = vec3(0.0);
                        float dep = 0.0;

                        color += max(uObjectA.rgb, uObjectD.rgb) * Box(
                            vec3( 
                                uObjectB.a * 2.0 * sin(uTime * 0.726), 
                                uObjectC.a * 2.0 * cos(uTime * 0.172), 
                                uObjectD.a * 2.0 * cos(uTime * 1.091)), 
                            vec3( 
                                uObjectE.a * 0.15 * sin(uTime * 0.321), 
                                uObjectF.a * 0.15 * cos(uTime * 0.272), 
                                uObjectA.a * 0.15 * cos(uTime * 0.091)),  
                            vec3( 
                                uObjectB.a * 0.24 + 0.01, 
                                uObjectC.a * 0.24 + 0.01, 
                                uObjectD.a * 0.24 + 0.01), currdot, normal, dep);

                        if(retdep + dep > 1.0) {
                            dep = 1.0 - retdep;
                            retdep += dep;
                            retnor += normal * dep;
                            retcol += color * dep;
                            break;
                        }
                        else 
                        {
                            retdep += dep;
                            retnor += normal * dep;
                            retcol += color * dep;
                        }
                    }
                    
                    if(retdep < 0.01) discard;

                    retnor = normalize(retnor);

                    float briA = dot(retnor, ligdirA);
                    float briB = dot(retnor, ligdirB);
                    float briC = dot(retnor, ligdirC);
                    float rfl = dot(retnor, camdir);
                    
                    retdep = smoothstep(0.99, 1.00, retdep);

                    retcol = 
                        retcol * retdep * 2.5 + 
                        retcol * smoothstep(-0.5, 1.0, briA) * 8.5 + 
                        (vec3(0.5) + retcol) * smoothstep( 0.95, 0.98, briA) + 
                        (vec3(0.5) + retcol) * smoothstep( 0.994, 0.995, briB) + 
                        (vec3(0.5) + retcol) * smoothstep( 0.999, 1.0, briC);

                    retcol = max(retcol, vec3(0.0, 0.1, 0.2) * smoothstep(-1.0, 3.0, rfl)); 

                    gl_FragColor = vec4(retcol, retdep);
                }
                `
            })
        ));
    }

    update(dt)
    {
        this.time += dt * 0.001;

        this.cam.position.x = 3.0 * Math.sin(this.time * 0.1 * Math.PI);
        this.cam.position.y = 0.0;
        this.cam.position.z =-3.0 * Math.cos(this.time * 0.1 * Math.PI);

        this.cam.rotation.y = this.time * 0.1 * Math.PI;

        this.uniforms.uCamFov.value = this.cam.fov;
        this.uniforms.uTime.value = this.time;
        this.uniforms.uBlur.value = 0.001;// 0.4 * Math.abs(Math.sin(this.time * 0.98));
        
        this.uniforms.uCamPosition.value[0] = this.cam.position.x;
        this.uniforms.uCamPosition.value[1] = this.cam.position.y;
        this.uniforms.uCamPosition.value[2] = this.cam.position.z;

        this.uniforms.uCamRotation.value[0] = this.cam.rotation.x;
        this.uniforms.uCamRotation.value[1] = this.cam.rotation.y;
        this.uniforms.uCamRotation.value[2] = this.cam.rotation.z;

        this.uniforms.uObjectA.value[0] = THREE.Math.lerp(0.2, 1.0, p5sl.smfft[0] * p5sl.smfft[0]) ;
        this.uniforms.uObjectA.value[1] = THREE.Math.lerp(0.2, 0.0, p5sl.smfft[0] * p5sl.smfft[0]) ;
        this.uniforms.uObjectA.value[2] = THREE.Math.lerp(0.2, 0.0, p5sl.smfft[0] * p5sl.smfft[0]) ;
        this.uniforms.uObjectA.value[3] = p5sl.smfft[80] * p5sl.smfft[80] * 1.25;

        this.uniforms.uObjectB.value[0] = THREE.Math.lerp(0.2, 1.0, p5sl.smfft[1]) ;
        this.uniforms.uObjectB.value[1] = THREE.Math.lerp(0.2, 1.0, p5sl.smfft[1]) ;
        this.uniforms.uObjectB.value[2] = THREE.Math.lerp(0.2, 0.0, p5sl.smfft[1]) ;
        this.uniforms.uObjectB.value[3] = p5sl.smfft[3] * p5sl.smfft[3]* 1.17;

        this.uniforms.uObjectC.value[0] = THREE.Math.lerp(0.2, 1.0, p5sl.smfft[5]) ;
        this.uniforms.uObjectC.value[1] = THREE.Math.lerp(0.2, 0.0, p5sl.smfft[5]) ;
        this.uniforms.uObjectC.value[2] = THREE.Math.lerp(0.2, 1.0, p5sl.smfft[5]) ;
        this.uniforms.uObjectC.value[3] = p5sl.smfft[7] * p5sl.smfft[7] * 1.17;

        this.uniforms.uObjectD.value[0] = THREE.Math.lerp(0.2, 0.0, p5sl.smfft[8]) ;
        this.uniforms.uObjectD.value[1] = THREE.Math.lerp(0.2, 0.0, p5sl.smfft[8]) ;
        this.uniforms.uObjectD.value[2] = THREE.Math.lerp(0.2, 1.0, p5sl.smfft[8]) ;
        this.uniforms.uObjectD.value[3] = p5sl.smfft[10] * p5sl.smfft[10] * 1.3;

        this.uniforms.uObjectE.value[0] = THREE.Math.lerp(0.2, 0.0, p5sl.smfft[13]);
        this.uniforms.uObjectE.value[1] = THREE.Math.lerp(0.2, 1.0, p5sl.smfft[13]);
        this.uniforms.uObjectE.value[2] = THREE.Math.lerp(0.2, 1.0, p5sl.smfft[13]);
        this.uniforms.uObjectE.value[3] = p5sl.smfft[9] * p5sl.smfft[9] * 1.3;

        this.uniforms.uObjectF.value[0] = THREE.Math.lerp(0.2, 0.0, p5sl.smfft[30]);
        this.uniforms.uObjectF.value[1] = THREE.Math.lerp(0.2, 1.0, p5sl.smfft[30]);
        this.uniforms.uObjectF.value[2] = THREE.Math.lerp(0.2, 0.0, p5sl.smfft[30]);
        this.uniforms.uObjectF.value[3] = p5sl.smfft[22] * p5sl.smfft[22] * 1.0;

    }

    render(rdrr){
        rdrr.render(this, this.camera, this.rendertarget);
    }

    resize(width, height) 
    {
        this.rendertarget.setSize(width, height);
        this.uniforms.uViewRatio.value = width / height;
    }

    get texture() { return this.rendertarget.texture; }
}

class PostProcessing_Shine extends THREE.Scene {

    constructor(targetscene, width, height)
    {
        super();

        this.rendertarget = new THREE.WebGLRenderTarget(width / 2, height / 2, {
            minFilter : THREE.LinearFilter,
            magFilter : THREE.LinearFilter
        });

        this.target = targetscene;
        this.camera = new THREE.Camera();

        this.uniforms = {
            uTexture : { type : "t", value : this.target.texture }
        };

        this.add(new THREE.Mesh(
            new THREE.PlaneGeometry(2.0, 2.0),
            new THREE.ShaderMaterial({
                uniforms : this.uniforms,
                transparent : true,
                vertexShader : `
                varying vec2 vTex;
                void main(void) 
                {
                    vTex = uv;
                    gl_Position = vec4(position, 1.0);
                }
                `,
                fragmentShader : `
                uniform sampler2D uTexture;
                varying vec2 vTex;
                void main(void)
                {
                    vec4 color = texture2D(uTexture, vTex);
                    color.r = pow(color.r, 12.0);
                    color.g = pow(color.g, 12.0);
                    color.b = pow(color.b, 12.0);
                    gl_FragColor = color;
                }
                `
            })
        ));
    }

    update(dt)
    {

    }

    render(rdrr)
    {
        rdrr.render(this, this.camera, this.rendertarget);
    }

    resize(width, height)
    {
        this.rendertarget.setSize(width / 2, height / 2);
    }

    get texture() { return this.rendertarget.texture; }
}

class PostProcessing_Blur extends THREE.Scene {

    constructor(targetscene, width, height)
    {
        super();

        this.rendertarget = new THREE.WebGLRenderTarget(width / 2, height / 2, {
            minFilter : THREE.LinearFilter,
            magFilter : THREE.LinearFilter
        });

        this.target = targetscene;
        this.camera = new THREE.Camera();

        this.uniforms = {
            uTexture : { type : "t", value : this.target.texture },
            uResolution : { type : "2f", value : [width / 2, height / 2]}
        };

        this.add(new THREE.Mesh(
            new THREE.PlaneGeometry(2.0, 2.0),
            new THREE.ShaderMaterial({
                uniforms : this.uniforms,
                transparent : true,
                vertexShader : `
                varying vec2 vTex;
                void main(void) 
                {
                    vTex = uv;
                    gl_Position = vec4(position, 1.0);
                }
                `,
                fragmentShader : `
                uniform sampler2D uTexture;
                uniform vec2 uResolution;

                varying vec2 vTex;

                float rand(vec2 co){
                    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
                }

                void main(void)
                {
                    vec2 offset = vec2(1.0) / uResolution;
                    vec4 color = vec4(0.0);
                    for(float i = 0.0; i < 1.0; i += 0.001)
                    {
                        float rad = 2.0 * 3.1415921685 * rand(vTex.xy - 0.1 * i);
                        float len = rand(vTex.yx + 0.1 * i);
    
                        float x = 32.0 * len * len * sin(rad);
                        float y = 32.0 * len * len * cos(rad);
    
                        color += texture2D(uTexture, vTex + offset * vec2(x, y)) * 0.001;
                    }

                    gl_FragColor = color;
                }
                `
            })
        ));
    }

    update(dt)
    {

    }

    render(rdrr)
    {
        rdrr.render(this, this.camera, this.rendertarget);
    }

    resize(width, height)
    {
        this.rendertarget.setSize(width / 2, height / 2);
        this.uniforms.uResolution.value[0] = width;
        this.uniforms.uResolution.value[1] = height;
    }

    get texture() { return this.rendertarget.texture; }
}

class PostProcessing_Merge extends THREE.Scene {

    constructor(targetsceneA, targetsceneB)
    {
        super();

        this.targetA = targetsceneA;
        this.targetB = targetsceneB;

        this.camera = new THREE.Camera();

        this.uniforms = {
            uTextureA : { type : "t", value : this.targetA.texture },
            uTextureB : { type : "t", value : this.targetB.texture },
        };

        this.add(new THREE.Mesh(
            new THREE.PlaneGeometry(2.0, 2.0),
            new THREE.ShaderMaterial({
                uniforms : this.uniforms,
                transparent : true,
                vertexShader : `
                varying vec2 vTex;
                void main(void) 
                {
                    vTex = uv;
                    gl_Position = vec4(position, 1.0);
                }
                `,
                fragmentShader : `
                uniform sampler2D uTextureA;
                uniform sampler2D uTextureB;

                varying vec2 vTex;
                void main(void)
                {
                    vec4 color = texture2D(uTextureA, vTex) + texture2D(uTextureB, vTex);
                    gl_FragColor = color;
                }
                `
            })
        ));
    }

    update(dt)
    {

    }

    render(rdrr)
    {
        rdrr.render(this, this.camera);
    }

    resize(width, height)
    {

    }
}

//Main 
window.onload = (function()
{
    this.dom = document.getElementById("renderer");
    p5sl.setup();

    //Renderer Setting
    this.rdrr = new THREE.WebGLRenderer({alpha : true});
    this.rdrr.setSize(this.dom.offsetWidth, this.dom.offsetHeight);
    this.dom.appendChild(this.rdrr.domElement);

    //Objects Setting
    this.mainscene = new MainScene(this.dom.offsetWidth, this.dom.offsetHeight);
    this.postprocessing_Shine = new PostProcessing_Shine(this.mainscene, this.dom.offsetWidth, this.dom.offsetHeight);
    this.postprocessing_Blur = new PostProcessing_Blur(this.postprocessing_Shine, this.dom.offsetWidth, this.dom.offsetHeight);
    this.postprocessing_Merge = new PostProcessing_Merge(this.postprocessing_Blur, this.mainscene);

    //Event Listener
    window.addEventListener("resize", this.resize.bind(this));

    //Start Update
    this.update.bind(this)(0, 0);

}).bind({

    /// Update Function
    update : function(ot, nt)
    {
        const dt = nt - ot;

        p5sl.update.bind(p5sl, dt * 0.001)();

        //scene update
        this.mainscene.update(dt);
        this.postprocessing_Shine.update(dt);
        this.postprocessing_Blur.update(dt);
        this.postprocessing_Merge.update(dt);

        //scene render
        this.mainscene.render(this.rdrr);
        this.postprocessing_Shine.render(this.rdrr);
        this.postprocessing_Blur.render(this.rdrr);
        this.postprocessing_Merge.render(this.rdrr);

        requestAnimationFrame(this.update.bind(this, nt));
    },

    /// Event Function
    resize : function()
    {
        this.rdrr.setSize(this.dom.offsetWidth, this.dom.offsetHeight);
        this.mainscene.resize(this.dom.offsetWidth, this.dom.offsetHeight);
        this.postprocessing_Shine.resize(this.dom.offsetWidth, this.dom.offsetHeight);
        this.postprocessing_Blur.resize(this.dom.offsetWidth, this.dom.offsetHeight);
        this.postprocessing_Merge.resize(this.dom.offsetWidth, this.dom.offsetHeight);
    }
});