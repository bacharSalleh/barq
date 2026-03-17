/*
 * pty-helper: Minimal PTY bridge in C
 * Forks a shell in a PTY, relays stdin/stdout.
 * Resize via: \x1b]R;<rows>;<cols>\x07
 *
 * Compile: cc -o pty-helper pty-helper.c -lutil
 * (macOS doesn't need -lutil, it's in libc)
 */
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <string.h>
#include <signal.h>
#include <sys/select.h>
#include <sys/ioctl.h>
#include <termios.h>
#include <util.h>
#include <fcntl.h>

#define BUF_SIZE 65536

static int master_fd;
static pid_t child_pid;

void set_nonblock(int fd) {
    int flags = fcntl(fd, F_GETFL, 0);
    fcntl(fd, F_SETFL, flags | O_NONBLOCK);
}

void handle_resize(const char *buf, int len) {
    /* Look for \x1b]R;<rows>;<cols>\x07 */
    const char *p = buf;
    const char *end = buf + len;
    while (p < end) {
        const char *esc = memchr(p, '\x1b', end - p);
        if (!esc || esc + 3 >= end || esc[1] != ']' || esc[2] != 'R' || esc[3] != ';')
            break;
        const char *start = esc + 4;
        const char *bel = memchr(start, '\x07', end - start);
        if (!bel) break;

        /* Parse rows;cols */
        int rows = 0, cols = 0;
        const char *semi = memchr(start, ';', bel - start);
        if (semi) {
            rows = atoi(start);
            cols = atoi(semi + 1);
            if (rows > 0 && cols > 0) {
                struct winsize ws = { .ws_row = rows, .ws_col = cols };
                ioctl(master_fd, TIOCSWINSZ, &ws);
                kill(child_pid, SIGWINCH);
            }
        }

        /* Write any data before the escape */
        if (esc > p)
            write(master_fd, p, esc - p);
        /* Write any data after the BEL */
        p = bel + 1;
    }
    /* Write remaining data that's not a resize command */
    if (p < end && p == buf) /* no resize found, write everything */
        write(master_fd, buf, len);
    else if (p < end)
        write(master_fd, p, end - p);
}

int main(int argc, char *argv[]) {
    const char *shell = getenv("SHELL");
    if (!shell) shell = "/bin/zsh";

    int cols = 120, rows = 30;
    const char *env_cols = getenv("COLUMNS");
    const char *env_rows = getenv("LINES");
    if (env_cols) cols = atoi(env_cols);
    if (env_rows) rows = atoi(env_rows);

    struct winsize ws = { .ws_row = rows, .ws_col = cols };
    child_pid = forkpty(&master_fd, NULL, NULL, &ws);

    if (child_pid < 0) {
        perror("forkpty");
        return 1;
    }

    if (child_pid == 0) {
        /* Child: exec shell */
        setenv("TERM", "xterm-256color", 1);
        execlp(shell, shell, "-i", NULL);
        perror("exec");
        _exit(1);
    }

    /* Parent: relay I/O */
    set_nonblock(STDIN_FILENO);
    set_nonblock(master_fd);

    signal(SIGWINCH, SIG_IGN);
    signal(SIGCHLD, SIG_IGN);

    char buf[BUF_SIZE];
    fd_set rfds;
    int maxfd = (master_fd > STDIN_FILENO ? master_fd : STDIN_FILENO) + 1;

    for (;;) {
        FD_ZERO(&rfds);
        FD_SET(STDIN_FILENO, &rfds);
        FD_SET(master_fd, &rfds);

        /* No timeout — blocks until data is available (zero CPU when idle) */
        if (select(maxfd, &rfds, NULL, NULL, NULL) < 0)
            break;

        if (FD_ISSET(master_fd, &rfds)) {
            ssize_t n = read(master_fd, buf, BUF_SIZE);
            if (n <= 0) break;
            write(STDOUT_FILENO, buf, n);
        }

        if (FD_ISSET(STDIN_FILENO, &rfds)) {
            ssize_t n = read(STDIN_FILENO, buf, BUF_SIZE);
            if (n <= 0) break;
            handle_resize(buf, n);
        }
    }

    kill(child_pid, SIGTERM);
    return 0;
}
