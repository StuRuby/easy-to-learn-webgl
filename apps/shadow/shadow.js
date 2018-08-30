/**
 * 实现阴影的基本思想：太阳看不见阴影。
 * 如果在光源处放置一位观察者，其视线方向与光线一致，那么观察者也看不到阴影。他看到的每一处都在光的照射下，而那些背后的，他没有看到的物体则处在阴影中。
 * 这里，我们需要使用光源与物体之间的距离来决定物体是否可见。实际上也就是物体在光源坐标系下的深度z值。
 * 
 * 我们需要使用两对着色器用以实现阴影：
 *  1. 一对着色器用来计算光源到物体的距离
 *  2. 另一对着色器根据 1 中计算出的距离绘制场景
 */

import { Matrix4 } from '../../utils/gl-matrix';

/**
 * SHADER_VSHADER_SOURCE 和 SHADER_FSHADER_SOURCE 负责生成阴影贴图。
 */
const SHADER_VSHADER_SOURCE = `
    attribute vec4 a_Position;
    uniform mat4 u_MvpMatrix;
    void main(){
        gl_Position = u_MvpMatrix * a_Position;
    }
`;

/**
 * 将片元的z值写入了纹理贴图中。
 * gl_FragCoord 是webgl的内置变量，表示片元的坐标。 gl_FragCoord.x和 gl_FragCoord.y是片元在屏幕上的坐标。
 * gl_FragCoord.z是深度值。
 * gl_FragCoord.z = (gl_Position.xyz/gl.Position.w)/2.0 + 0.5;
 * 计算结果都被归一化到[0.0,1.0]区间。如果结果为0，表示该片元在近裁剪面，如果是1.0，表示片元在远裁剪面上。
 */
const SHADER_FSHADER_SOURCE = `
    precision mediump float;
    void main(){
        //将值写入到阴影贴图的R分量之中
        gl_FragColor = vec4(gl_FragCoord.z,0.0,0.0,0.0 );
    }
`;


/**
 * 我们需要比较片元在光源坐标系下的z值和阴影贴图中对应的值来决定当前片元是否处于阴影之中。
 */
const VSHADER_SOURCE = `
    attribute vec4 a_Position;
    attribute vec4 a_Color;
    uniform mat4 u_MvpMatrix;
    uniform mat4 u_MvpMatrixFromLight;
    varying vec4 v_PositionFromLight; //等价于上一个着色器中的 gl_Position.
    varying vec4 v_Color;
    void main(){
        gl_Position = u_MvpMatrix *  a_Position;
        v_PositionFromLight = u_MvpMatrixFromLight * a_Position;
        v_Color = a_Color;
    }
`;
/**
 * 根据片元在光源坐标系中的坐标 v_PositionFromLight 计算出可以与阴影贴图相比较的z值。
 */
const FSHADER_SOURCE = `
    precision mediump float;
    uniform sampler2D u_ShadowMap;
    varying vec4 v_PositionFromLight;
    varying vec4 v_Color;
    void main(){
        vec3 shadowCoord = (v_PositionFromLight.xyz/v_PositionFromLight.w)/2.0 + 0.5;
        vec4 rgbaDepth = texture2D(u_ShadowMap,shadowCoord.xy);
        float depth = rgbaDepth.r;
        float visibility = (shadowCoord.z > depth + 0.005) ? 0.7 : 1.0; 
        gl_FragColor = vec4(v_Color.rgb * visibility , v_Color.a);
    }
`;