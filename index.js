import page from 'page';
import mouseControl from './apps/mouseControl';
import pickedObject from './apps/picked/picked-object';
import pickedFace from './apps/picked/picked-face';
import hud from './apps/hud';

page('/', function(){
    hud();
});
page();