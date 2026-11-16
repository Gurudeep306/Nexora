fn valid(s: &str) -> bool {
    let mut st: Vec<char> = Vec::new();
    for c in s.chars() {
        match c {
            '(' | '[' => st.push(c),
            ')' => {
                if st.pop() != Some('(') {
                    return false;
                }
            }
            ']' => {
                if st.pop() != Some('[') {
                    return false;
                }
            }
            _ => {}
        }
    }
    st.is_empty()
}

fn main() {
    println!("{} {}", valid("([])"), valid("(]"));
}
