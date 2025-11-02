declare module 'ml-regression' {
  export class SimpleLinearRegression {
    constructor(x: number[], y: number[]);
    predict(x: number): number;
    score(x: number[], y: number[]): { r2: number };
    slope: number;
    intercept: number;
  }

  export class PolynomialRegression {
    constructor(x: number[], y: number[], degree: number);
    predict(x: number): number;
    score(x: number[], y: number[]): { r2: number };
  }
}
