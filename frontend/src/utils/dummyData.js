export const dummyCode = `ListNode reverseList(ListNode head) {
    ListNode prev = null;
    ListNode curr = head;
    while (curr != null) {
        ListNode nextNode = curr.next;
        curr.next = prev;
        prev = curr;
        curr = nextNode;
    }
    return prev;
}`;

export const dummySteps = [
  {
    line: 1,
    variables: { head: "0x100", prev: "undefined", curr: "undefined" },
    explanation: "We start with the head pointer pointing to the first node at memory address 0x100.",
    listState: {
      nodes: [
        { value: 12, addr: "0x100", next: "0x108" },
        { value: 99, addr: "0x108", next: "0x110" },
        { value: 37, addr: "0x110", next: "null" }
      ],
      pointers: { head: "0x100", prev: null, curr: null, nextNode: null },
      highlights: { node: null, edge: null, pointer: "head" }
    }
  },
  {
    line: 2,
    variables: { head: "0x100", prev: "null", curr: "undefined" },
    explanation: "Initialize 'prev' pointer to null, indicating the new end of our reversed list.",
    listState: {
      nodes: [
        { value: 12, addr: "0x100", next: "0x108" },
        { value: 99, addr: "0x108", next: "0x110" },
        { value: 37, addr: "0x110", next: "null" }
      ],
      pointers: { head: "0x100", prev: "null", curr: null, nextNode: null },
      highlights: { node: null, edge: null, pointer: "prev" }
    }
  },
  {
    line: 3,
    variables: { head: "0x100", prev: "null", curr: "0x100" },
    explanation: "Initialize 'curr' pointer to point to the current head node (0x100).",
    listState: {
      nodes: [
        { value: 12, addr: "0x100", next: "0x108" },
        { value: 99, addr: "0x108", next: "0x110" },
        { value: 37, addr: "0x110", next: "null" }
      ],
      pointers: { head: "0x100", prev: "null", curr: "0x100", nextNode: null },
      highlights: { node: null, edge: null, pointer: "curr" }
    }
  },
  // Loop iteration 1
  {
    line: 5,
    variables: { head: "0x100", prev: "null", curr: "0x100", nextNode: "0x108" },
    explanation: "Inside the loop: Store curr.next in 'nextNode' (0x108) so we don't lose the rest of the list.",
    listState: {
      nodes: [
        { value: 12, addr: "0x100", next: "0x108" },
        { value: 99, addr: "0x108", next: "0x110" },
        { value: 37, addr: "0x110", next: "null" }
      ],
      pointers: { head: "0x100", prev: "null", curr: "0x100", nextNode: "0x108" },
      highlights: { node: null, edge: null, pointer: "nextNode" }
    }
  },
  {
    line: 6,
    variables: { head: "0x100", prev: "null", curr: "0x100", nextNode: "0x108" },
    explanation: "Reversing the link! Set curr.next to 'prev' (null). The connection to 0x108 is severed.",
    listState: {
      nodes: [
        { value: 12, addr: "0x100", next: "null" },
        { value: 99, addr: "0x108", next: "0x110" },
        { value: 37, addr: "0x110", next: "null" }
      ],
      pointers: { head: "0x100", prev: "null", curr: "0x100", nextNode: "0x108" },
      highlights: { node: "0x100", edge: "0x100->null", pointer: null }
    }
  },
  {
    line: 7,
    variables: { head: "0x100", prev: "0x100", curr: "0x100", nextNode: "0x108" },
    explanation: "Move 'prev' forward to 'curr' (0x100).",
    listState: {
      nodes: [
        { value: 12, addr: "0x100", next: "null" },
        { value: 99, addr: "0x108", next: "0x110" },
        { value: 37, addr: "0x110", next: "null" }
      ],
      pointers: { head: "0x100", prev: "0x100", curr: "0x100", nextNode: "0x108" },
      highlights: { node: null, edge: null, pointer: "prev" }
    }
  },
  {
    line: 8,
    variables: { head: "0x100", prev: "0x100", curr: "0x108", nextNode: "0x108" },
    explanation: "Move 'curr' forward to 'nextNode' (0x108). We're ready for the next node.",
    listState: {
      nodes: [
        { value: 12, addr: "0x100", next: "null" },
        { value: 99, addr: "0x108", next: "0x110" },
        { value: 37, addr: "0x110", next: "null" }
      ],
      pointers: { head: "0x100", prev: "0x100", curr: "0x108", nextNode: "0x108" },
      highlights: { node: null, edge: null, pointer: "curr" }
    }
  },
  // Loop iteration 2
  {
    line: 5,
    variables: { head: "0x100", prev: "0x100", curr: "0x108", nextNode: "0x110" },
    explanation: "Loop 2: Update 'nextNode' to curr.next (0x110).",
    listState: {
      nodes: [
        { value: 12, addr: "0x100", next: "null" },
        { value: 99, addr: "0x108", next: "0x110" },
        { value: 37, addr: "0x110", next: "null" }
      ],
      pointers: { head: "0x100", prev: "0x100", curr: "0x108", nextNode: "0x110" },
      highlights: { node: null, edge: null, pointer: "nextNode" }
    }
  },
  {
    line: 6,
    variables: { head: "0x100", prev: "0x100", curr: "0x108", nextNode: "0x110" },
    explanation: "Point curr.next to 'prev' (0x100). The node at 0x108 now points back to the node at 0x100.",
    listState: {
      nodes: [
        { value: 12, addr: "0x100", next: "null" },
        { value: 99, addr: "0x108", next: "0x100" },
        { value: 37, addr: "0x110", next: "null" }
      ],
      pointers: { head: "0x100", prev: "0x100", curr: "0x108", nextNode: "0x110" },
      highlights: { node: "0x108", edge: "0x108->0x100", pointer: null }
    }
  },
  {
    line: 7,
    variables: { head: "0x100", prev: "0x108", curr: "0x108", nextNode: "0x110" },
    explanation: "Move 'prev' forward to 'curr' (0x108).",
    listState: {
      nodes: [
        { value: 12, addr: "0x100", next: "null" },
        { value: 99, addr: "0x108", next: "0x100" },
        { value: 37, addr: "0x110", next: "null" }
      ],
      pointers: { head: "0x100", prev: "0x108", curr: "0x108", nextNode: "0x110" },
      highlights: { node: null, edge: null, pointer: "prev" }
    }
  },
  {
    line: 8,
    variables: { head: "0x100", prev: "0x108", curr: "0x110", nextNode: "0x110" },
    explanation: "Move 'curr' forward to 'nextNode' (0x110).",
    listState: {
      nodes: [
        { value: 12, addr: "0x100", next: "null" },
        { value: 99, addr: "0x108", next: "0x100" },
        { value: 37, addr: "0x110", next: "null" }
      ],
      pointers: { head: "0x100", prev: "0x108", curr: "0x110", nextNode: "0x110" },
      highlights: { node: null, edge: null, pointer: "curr" }
    }
  },
  // Loop iteration 3
  {
    line: 5,
    variables: { head: "0x100", prev: "0x108", curr: "0x110", nextNode: "null" },
    explanation: "Loop 3: Update 'nextNode' to curr.next (null).",
    listState: {
      nodes: [
        { value: 12, addr: "0x100", next: "null" },
        { value: 99, addr: "0x108", next: "0x100" },
        { value: 37, addr: "0x110", next: "null" }
      ],
      pointers: { head: "0x100", prev: "0x108", curr: "0x110", nextNode: "null" },
      highlights: { node: null, edge: null, pointer: "nextNode" }
    }
  },
  {
    line: 6,
    variables: { head: "0x100", prev: "0x108", curr: "0x110", nextNode: "null" },
    explanation: "Point curr.next to 'prev' (0x108). The node at 0x110 now points back to 0x108.",
    listState: {
      nodes: [
        { value: 12, addr: "0x100", next: "null" },
        { value: 99, addr: "0x108", next: "0x100" },
        { value: 37, addr: "0x110", next: "0x108" }
      ],
      pointers: { head: "0x100", prev: "0x108", curr: "0x110", nextNode: "null" },
      highlights: { node: "0x110", edge: "0x110->0x108", pointer: null }
    }
  },
  {
    line: 7,
    variables: { head: "0x100", prev: "0x110", curr: "0x110", nextNode: "null" },
    explanation: "Move 'prev' forward to 'curr' (0x110).",
    listState: {
      nodes: [
        { value: 12, addr: "0x100", next: "null" },
        { value: 99, addr: "0x108", next: "0x100" },
        { value: 37, addr: "0x110", next: "0x108" }
      ],
      pointers: { head: "0x100", prev: "0x110", curr: "0x110", nextNode: "null" },
      highlights: { node: null, edge: null, pointer: "prev" }
    }
  },
  {
    line: 8,
    variables: { head: "0x100", prev: "0x110", curr: "null", nextNode: "null" },
    explanation: "Move 'curr' forward to 'nextNode' (null).",
    listState: {
      nodes: [
        { value: 12, addr: "0x100", next: "null" },
        { value: 99, addr: "0x108", next: "0x100" },
        { value: 37, addr: "0x110", next: "0x108" }
      ],
      pointers: { head: "0x100", prev: "0x110", curr: "null", nextNode: "null" },
      highlights: { node: null, edge: null, pointer: "curr" }
    }
  },
  // End of loop
  {
    line: 10,
    variables: { head: "0x100", prev: "0x110", curr: "null", nextNode: "null" },
    explanation: "The loop terminates because curr is null. Return 'prev' (0x110) which is the new head of the reversed list!",
    listState: {
      nodes: [
        { value: 12, addr: "0x100", next: "null" },
        { value: 99, addr: "0x108", next: "0x100" },
        { value: 37, addr: "0x110", next: "0x108" }
      ],
      pointers: { head: "0x100", prev: "0x110", curr: "null", nextNode: "null" },
      highlights: { node: "0x110", edge: null, pointer: "prev" }
    }
  }
];
