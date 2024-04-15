import {Component} from '@wonderlandengine/api';
import {typename} from '../../constants.js';

/**
 * Pushes the player backwards when their head collides with a wall / object
 */

export class HeadCollissionMove extends Component {
    static TypeName = typename('head-collission-move');
}
