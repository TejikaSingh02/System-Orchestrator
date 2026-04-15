// Real Task: Test the GraphService (Kahn's Algorithm) with real test cases
const path = require('path');
const GraphService = require(path.resolve(__dirname, '../../src/services/GraphService'));

console.log('=== GRAPH SERVICE UNIT TEST ===\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  [PASS] ${name}`);
        passed++;
    } catch (e) {
        console.log(`  [FAIL] ${name}`);
        console.log(`         Reason: ${e.message}`);
        failed++;
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message || 'Assertion failed');
}

// Test 1: Simple linear chain resolves correctly
test('Linear chain [A → B → C] produces 3 layers', () => {
    const layers = GraphService.buildDependencyGraph([
        { id: 'A', dependencies: [] },
        { id: 'B', dependencies: ['A'] },
        { id: 'C', dependencies: ['B'] }
    ]);
    assert(layers.length === 3, `Expected 3 layers, got ${layers.length}`);
    assert(layers[0].includes('A'), 'Layer 1 should contain A');
    assert(layers[1].includes('B'), 'Layer 2 should contain B');
    assert(layers[2].includes('C'), 'Layer 3 should contain C');
});

// Test 2: Independent tasks run in same layer
test('Independent tasks [A, B, C] all in Layer 1 (parallel)', () => {
    const layers = GraphService.buildDependencyGraph([
        { id: 'A', dependencies: [] },
        { id: 'B', dependencies: [] },
        { id: 'C', dependencies: [] }
    ]);
    assert(layers.length === 1, `Expected 1 layer, got ${layers.length}`);
    assert(layers[0].length === 3, `Expected 3 tasks in layer 1`);
});

// Test 3: Diamond dependency (fan-out + fan-in)
test('Diamond [A → B,C → D] produces 3 layers', () => {
    const layers = GraphService.buildDependencyGraph([
        { id: 'A', dependencies: [] },
        { id: 'B', dependencies: ['A'] },
        { id: 'C', dependencies: ['A'] },
        { id: 'D', dependencies: ['B', 'C'] }
    ]);
    assert(layers.length === 3, `Expected 3 layers, got ${layers.length}`);
    assert(layers[1].includes('B') && layers[1].includes('C'), 'B and C should run in parallel');
});

// Test 4: Cycle detection
test('Cyclic dependency [A → B → A] throws an error', () => {
    let threw = false;
    try {
        GraphService.buildDependencyGraph([
            { id: 'A', dependencies: ['B'] },
            { id: 'B', dependencies: ['A'] }
        ]);
    } catch (e) {
        threw = e.message.toLowerCase().includes('cyclic');
    }
    assert(threw, 'Should have thrown a cyclic dependency error');
});

// Test 5: Missing dependency throws
test('Unknown dependency reference throws an error', () => {
    let threw = false;
    try {
        GraphService.buildDependencyGraph([
            { id: 'A', dependencies: ['GHOST_TASK'] }
        ]);
    } catch (e) {
        threw = true;
    }
    assert(threw, 'Should have thrown for unknown dependency');
});

// Results
console.log(`\n────────────────────────────────`);
console.log(`Tests Run     : ${passed + failed}`);
console.log(`Passed        : ${passed}`);
console.log(`Failed        : ${failed}`);
console.log(failed === 0 ? '\n✔ All tests passed.' : '\n❌ Some tests failed!');

if (failed > 0) process.exit(1);
