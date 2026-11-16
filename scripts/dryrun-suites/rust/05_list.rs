#[derive(Debug)]
struct ListNode {
    val: i32,
    next: Option<Box<ListNode>>,
}

fn reverse(head: Option<Box<ListNode>>) -> Option<Box<ListNode>> {
    let mut prev = None;
    let mut cur = head;
    while let Some(mut node) = cur {
        cur = node.next.take();
        node.next = prev;
        prev = Some(node);
    }
    prev
}

fn main() {
    let mut head = None;
    for v in (1..=4).rev() {
        head = Some(Box::new(ListNode { val: v, next: head }));
    }
    let mut r = reverse(head);
    let mut out = Vec::new();
    while let Some(node) = r {
        out.push(node.val);
        r = node.next;
    }
    println!("{:?}", out);
}
