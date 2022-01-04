import { main } from './utils/';
import { ltvParams } from './utils/constants';

console.clear();
console.log(`LTV Params Trigger: ${ltvParams.UPPER}% | Target: ${ltvParams.TARGET * 100}%`);
console.log('Anchor LTV');

main();