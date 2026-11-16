use std::cell::RefCell;
use std::rc::Rc;

#[derive(Debug)]
pub struct TreeNode {
    pub val: i32,
    pub left: Option<Rc<RefCell<TreeNode>>>,
    pub right: Option<Rc<RefCell<TreeNode>>>,
}

fn insert(root: Option<Rc<RefCell<TreeNode>>>, v: i32) -> Option<Rc<RefCell<TreeNode>>> {
    match root {
        None => Some(Rc::new(RefCell::new(TreeNode { val: v, left: None, right: None }))),
        Some(node) => {
            {
                let mut n = node.borrow_mut();
                if v < n.val {
                    n.left = insert(n.left.take(), v);
                } else {
                    n.right = insert(n.right.take(), v);
                }
            }
            Some(node)
        }
    }
}

fn height(r: &Option<Rc<RefCell<TreeNode>>>) -> i32 {
    match r {
        None => 0,
        Some(n) => 1 + height(&n.borrow().left).max(height(&n.borrow().right)),
    }
}

fn main() {
    let mut root = None;
    for v in [50, 30, 70, 20] {
        root = insert(root, v);
    }
    println!("{}", height(&root));
}
