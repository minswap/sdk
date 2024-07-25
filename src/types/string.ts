export namespace StringUtils {
    export function compare(s1: string, s2: string): number {
        if (s1 < s2) {
            return -1;
        }
        if (s1 === s2) {
            return 0;
        }
        return 1;
    }
}