import { Banana } from "./def_b";
/* FILE 2: */
/* code ... */
type Apple = {
  name: string;
  b: Banana;
  bc: {
    b: Banana;
    c: Cherry;
  }
}
/* code ... */
type Cherry = boolean;
/* code ... */
export { Apple, Cherry };
