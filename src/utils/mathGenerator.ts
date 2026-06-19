export interface MathQuestion {
  id: number;
  expression: string; // Printable string, e.g. "(75 + 45) ÷ 4"
  answer: number;
  steps: string[]; // Steps showing correct intermediate calculation
  type: 'addSub' | 'mulDiv' | 'mixedParentheses';
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate a single math question matching the strict conditions
export function generateQuestionItem(id: number, type: 'addSub' | 'mulDiv' | 'mixedParentheses'): MathQuestion | null {
  try {
    if (type === 'addSub') {
      // 纯加减混合, 1000以内, 无括号
      // 必须遵守：一道题中不要同时出现3位数的加减法（至多有一个3位数，其余两个为1/2位数）
      const format = randInt(0, 1);
      
      // Select which operand (0 for A, 1 for B, 2 for C, or 3 for none) gets to be 3-digit
      const listThreeDigit = [false, false, false];
      const threeDigitIdx = randInt(0, 3);
      if (threeDigitIdx < 3) {
        listThreeDigit[threeDigitIdx] = true;
      }
      
      const A = listThreeDigit[0] ? randInt(100, 900) : randInt(10, 99);
      const B = listThreeDigit[1] ? randInt(100, 900) : randInt(10, 99);
      const C = listThreeDigit[2] ? randInt(100, 900) : randInt(10, 99);

      if (format === 0) {
        // A + B - C
        const sum = A + B;
        if (sum > 1000) return null;
        const ans = sum - C;
        if (ans < 0 || ans > 1000) return null;
        return {
          id,
          expression: `${A} + ${B} - ${C}`,
          answer: ans,
          steps: [
            `${A} + ${B} = ${sum}`,
            `${sum} - ${C} = ${ans}`
          ],
          type
        };
      } else {
        // A - B + C
        if (A < B) return null;
        const diff = A - B;
        const ans = diff + C;
        if (ans > 1000) return null;
        return {
          id,
          expression: `${A} - ${B} + ${C}`,
          answer: ans,
          steps: [
            `${A} - ${B} = ${diff}`,
            `${diff} + ${C} = ${ans}`
          ],
          type
        };
      }
    } else if (type === 'mulDiv') {
      // 纯乘除混合, 100以内, 无括号
      // 两位数 ÷ 一位数, 两位数 × 一位数
      const format = randInt(0, 2);
      if (format === 0) {
        // A × B ÷ C
        // A is two-digit (10-45), B is 1-digit (2-9), A * B <= 100
        const B = randInt(2, 9);
        const C = randInt(2, 9);
        const maxA = Math.floor(100 / B);
        if (maxA < 10) return null;
        const A = randInt(10, maxA);
        const prod = A * B;
        if (prod % C !== 0) return null;
        const ans = prod / C;
        if (ans > 100 || ans <= 0) return null;
        return {
          id,
          expression: `${A} × ${B} ÷ ${C}`,
          answer: ans,
          steps: [
            `${A} × ${B} = ${prod}`,
            `${prod} ÷ ${C} = ${ans}`
          ],
          type
        };
      } else if (format === 1) {
        // A ÷ B × C
        const B = randInt(2, 9);
        const C = randInt(2, 9);
        // A is two-digit, B is one-digit, A / B is K. K * C <= 100
        const K = randInt(2, Math.floor(100 / C));
        const A = K * B;
        if (A < 10 || A >= 100) return null;
        const ans = K * C;
        if (ans > 100) return null;
        return {
          id,
          expression: `${A} ÷ ${B} × ${C}`,
          answer: ans,
          steps: [
            `${A} ÷ ${B} = ${K}`,
            `${K} × ${C} = ${ans}`
          ],
          type
        };
      } else {
        // A ÷ B ÷ C
        const B = randInt(2, 5);
        const C = randInt(2, 5);
        const ans = randInt(2, 10);
        const A = ans * B * C;
        if (A < 10 || A >= 100) return null;
        const temp = ans * C;
        return {
          id,
          expression: `${A} ÷ ${B} ÷ ${C}`,
          answer: ans,
          steps: [
            `${A} ÷ ${B} = ${temp}`,
            `${temp} ÷ ${C} = ${ans}`
          ],
          type
        };
      }
    } else {
      // mixedParentheses: 含小括号的混合运算（不混用加减与乘除！）
      // 必须包含小括号，遵循：先括号 → 再括号外
      const isSubAdd = Math.random() < 0.5;

      if (isSubAdd) {
        // 纯加减含小括号, 1000以内
        // 至多有一个3位数
        const format = randInt(0, 3);
        const listThreeDigit = [false, false, false];
        const threeDigitIdx = randInt(0, 3);
        if (threeDigitIdx < 3) {
          listThreeDigit[threeDigitIdx] = true;
        }
        
        const A = listThreeDigit[0] ? randInt(100, 900) : randInt(10, 99);
        const B = listThreeDigit[1] ? randInt(100, 900) : randInt(10, 99);
        const C = listThreeDigit[2] ? randInt(100, 900) : randInt(10, 99);

        if (format === 0) {
          // (A + B) - C
          const sum = A + B;
          if (sum > 1000) return null;
          const ans = sum - C;
          if (ans < 0 || ans > 1000) return null;
          return {
            id,
            expression: `(${A} + ${B}) - ${C}`,
            answer: ans,
            steps: [
              `括号里面：${A} + ${B} = ${sum}`,
              `括号外面：${sum} - ${C} = ${ans}`
            ],
            type
          };
        } else if (format === 1) {
          // A - (B + C)
          const sum = B + C;
          if (sum > 1000) return null;
          const ans = A - sum;
          if (ans < 0 || ans > 1000) return null;
          return {
            id,
            expression: `${A} - (${B} + ${C})`,
            answer: ans,
            steps: [
              `括号里面：${B} + ${C} = ${sum}`,
              `括号外面：${A} - ${sum} = ${ans}`
            ],
            type
          };
        } else if (format === 2) {
          // A + (B - C)
          if (B < C) return null;
          const diff = B - C;
          const ans = A + diff;
          if (ans > 1000) return null;
          return {
            id,
            expression: `${A} + (${B} - ${C})`,
            answer: ans,
            steps: [
              `括号里面：${B} - ${C} = ${diff}`,
              `括号外面：${A} + ${diff} = ${ans}`
            ],
            type
          };
        } else {
          // (A - B) + C
          if (A < B) return null;
          const diff = A - B;
          const ans = diff + C;
          if (ans > 1000) return null;
          return {
            id,
            expression: `(${A} - ${B}) + ${C}`,
            answer: ans,
            steps: [
              `括号里面：${A} - ${B} = ${diff}`,
              `括号外面：${diff} + ${C} = ${ans}`
            ],
            type
          };
        }
      } else {
        // 纯乘除含小括号, 100以内
        const format = randInt(0, 3);
        if (format === 0) {
          // (A × B) ÷ C
          const B = randInt(2, 9);
          const C = randInt(2, 9);
          const maxA = Math.floor(100 / B);
          if (maxA < 10) return null;
          const A = randInt(10, maxA);
          const prod = A * B;
          if (prod % C !== 0) return null;
          const ans = prod / C;
          if (ans > 100 || ans <= 0) return null;
          return {
            id,
            expression: `(${A} × ${B}) ÷ ${C}`,
            answer: ans,
            steps: [
              `括号里面：${A} × ${B} = ${prod}`,
              `括号外面：${prod} ÷ ${C} = ${ans}`
            ],
            type
          };
        } else if (format === 1) {
          // (A ÷ B) × C
          const B = randInt(2, 9);
          const C = randInt(2, 9);
          const K = randInt(2, Math.floor(100 / C));
          const A = K * B;
          if (A < 10 || A >= 100) return null;
          const ans = K * C;
          if (ans > 100) return null;
          return {
            id,
            expression: `(${A} ÷ ${B}) × ${C}`,
            answer: ans,
            steps: [
              `括号里面：${A} ÷ ${B} = ${K}`,
              `括号外面：${K} × ${C} = ${ans}`
            ],
            type
          };
        } else if (format === 2) {
          // A × (B ÷ C)
          const C = randInt(2, 9);
          const K = randInt(2, 10);
          const B = K * C;
          if (B < 10 || B >= 100) return null;
          const A = randInt(2, Math.floor(100 / K));
          const ans = A * K;
          if (ans > 100) return null;
          return {
            id,
            expression: `${A} × (${B} ÷ ${C})`,
            answer: ans,
            steps: [
              `括号里面：${B} ÷ ${C} = ${K}`,
              `括号外面：${A} × ${K} = ${ans}`
            ],
            type
          };
        } else {
          // A ÷ (B × C)
          // B * C is low, divides A
          const B = randInt(2, 4);
          const C = randInt(2, 4);
          const prod = B * C;
          const ans = randInt(2, 10);
          const A = ans * prod;
          if (A < 10 || A >= 100) return null;
          return {
            id,
            expression: `${A} ÷ (${B} × ${C})`,
            answer: ans,
            steps: [
              `括号里面：${B} × ${C} = ${prod}`,
              `括号外面：${A} ÷ ${prod} = ${ans}`
            ],
            type
          };
        }
      }
    }
  } catch (e) {
    return null;
  }
}

// Generate the 50 math questions
export function generate50Questions(): MathQuestion[] {
  const resultList: MathQuestion[] = [];
  
  // Set accurate target amounts per type for high variation:
  // 17 addSub, 17 mulDiv, 16 mixedParentheses
  const subTypes: { type: 'addSub' | 'mulDiv' | 'mixedParentheses'; count: number }[] = [
    { type: 'addSub', count: 17 },
    { type: 'mulDiv', count: 17 },
    { type: 'mixedParentheses', count: 16 }
  ];
  
  let currentId = 1;
  for (const item of subTypes) {
    let generatedCount = 0;
    let attempts = 0;
    while (generatedCount < item.count && attempts < 4000) {
      attempts++;
      const question = generateQuestionItem(currentId, item.type);
      if (question) {
        // Ensure no exact duplicate formulas exist
        const isDuplicate = resultList.some(q => q.expression === question.expression);
        if (!isDuplicate) {
          resultList.push(question);
          currentId++;
          generatedCount++;
        }
      }
    }
  }
  
  // Shuffle resultList slightly to mix the types up for a realistic test paper experience
  const shuffled = resultList.map((value) => ({ value, sort: Math.random() }))
                            .sort((a, b) => a.sort - b.sort)
                            .map(({ value }) => value);
  
  // Re-index from 1 to 50
  return shuffled.map((q, idx) => ({
    ...q,
    id: idx + 1
  }));
}
