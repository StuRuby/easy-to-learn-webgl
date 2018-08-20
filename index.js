import page from 'page';
import mouseControl from './apps/mouseControl';
import pickedObject from './apps/picked/picked-object';

page('/', function(){
    pickedObject();
});
page();