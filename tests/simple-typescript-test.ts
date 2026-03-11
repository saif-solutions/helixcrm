// Test with TypeScript syntax that was failing
interface TestInterface {
  id: string;
  data: number;
}

function testFunction<T>(input: T): T {
  return input;
}

describe('TypeScript Parsing', () => {
  it('should handle TypeScript syntax correctly', () => {
    const obj: TestInterface = { id: 'test', data: 42 };
    expect(testFunction(obj)).toEqual(obj);
  });
});
