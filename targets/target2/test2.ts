/* FILE 1: */
/* code ... */
type B = number;
/* code ... */


/* FILE 2: */
/* code ... */
type A = {
  name: string;
  b: B;
}
/* code ... */
type C = boolean;
/* code ... */

/* FILE 3 */
/* code ... */
const myFunc: (_: A) => C =
  __HOLE__;
/* code ... */

/* should return 

type B = number;
type A = {
  name: string;
  b: B;
}
type C = boolean;


*/