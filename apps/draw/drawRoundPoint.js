/**
 * webgl在绘制过程中，顶点着色器和片元着色器之间发生了光栅化过程，一个顶点被光栅化为多个片元，每个片元都会经过片元着色器的处理。
 * 如果直接进行绘制，画出的就是方形的点。
 * 为了画出圆形的点，我们需要在片元着色器中稍作改动，将矩形削成圆形。
 */

const VSHADER_SOURCE = `
    attribute vec4 a_Position;
    void main(){
        gl_Position = a_Position;
        gl_PointSize = 10.0;
    }
 `;

/**
 * 计算出片元与所属点中心的距离之后，就判断该距离是否小于0.5，即是否在`圆点`范围内。
 * 如果片元在圆点之内，就照常为`gl_FragColor`赋值以绘制该片元。否则使用`discard`语句，webgl会自动舍弃该片元，直接处理下一个片元。
 */
const FSHADER_SOURCE = `
    precision mediump float;
    void main(){
        float d = distance(gl_PointCoord,vec2(0.5,0.5));
        if(d<0.5){
            gl_FragColor = vec4(1.0,0.0,0.0,1.0);
        }else{
            discard;
        }
    }
 `;

function main() {
    const canvas = document.getElementById('webgl');
    /**
     * @type { WebGLRenderingContext }
     */
    const gl = canvas.getContext('webgl');

    if (!gl) {
        console.error('获取webgl对象报错');
        return;
    }

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

    gl.shaderSource(vertexShader, VSHADER_SOURCE);
    gl.shaderSource(fragmentShader, FSHADER_SOURCE);

    gl.compileShader(vertexShader);
    gl.compileShader(fragmentShader);

    const program = gl.createProgram();

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);

    gl.linkProgram(program);
    gl.useProgram(program);

    gl.program = program;


    const n = initVertexBuffers(gl);
    if (n < 0) {
        console.log('Failed to create the buffer object');
        return false;
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawArrays(gl.POINTS, 0, n);
}

/**
 * 
 * @param {WebGLRenderingContext} gl 
 */
function initVertexBuffers(gl) {
    const vertices = new Float32Array([
        0, 0.5, -0.5, -0.5, 0.5, -0.5
    ]);

    const n = 3;

    const vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) {
        console.log('Failed to create the buffer');
        return -1;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
        return -1;
    }

    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    gl.enableVertexAttribArray(a_Position);

    return n;
}

export default main;