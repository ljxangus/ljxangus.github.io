---
layout: post
title:  "Multithread synchronization in Python"
description: "本文分析Python中多线程使用的几种方式"
date:   2018-05-16 01:37:14 10:58:21 +0800
type: card-img-top
image: http://placehold.it/750X300?text=Header+Image # for local images, place in /assets/img/posts/
caption:
last-updated: 2018-05-16 01:37:14 10:58:21 +0800
categories: post
tag: 多线程
author: Liang Jiaxin
card: card-3
---

最近在开发 TS System 的时候经常会遇到 Multithread 的 同步问题，尤其是在 TDM, FDM 多路接入的时候情况突出。<!--more-->
于是在网上搜素了一下关于 Multithread Synchronization 的编程技巧，找到一篇不错的教材。
> <https://hackernoon.com/synchronization-primitives-in-python-564f89fee732>

### 以下是它的简短总结

首先常见的同步特性分为这几种：

* Locks
* RLocks
* Semaphores
* Events
* Conditions
* Barriers

### Locks

`from threading import Lock`

应该是最简单的同步结构，只运用 `Lock.acquire()` 与 `Lock.release()`。
`acquire` 需要由对应的 `release()` 来解除锁定。任何函数调用 `acquire()` 的时候，如果它已经被其他线程调用了的话，就会被 block 住。注意的是 `release()` 必须要在 `acquire()` 的 state 里面调用，否则会出现 `RunTimeError`。

常用场景：多个线程共同编辑 share variable。

*重要Tips*：当多个线程需要编辑或者调用共享变量/函数，而我们却又不想它被 block 的话，则可以利用 `blocking` 特性，在参数中设置 `acquire(blocking=False)`。

### RLocks

`from threading import RLock`

`RLock` 最大的特点是，线程并不会被自己已经调用的 `acquire`  block，尤其适合 recursion 的情况。

```python
#rlock_tut.py
import threading

num = 0
lock = Threading.Lock()

lock.acquire()
num += 1
lock.acquire() # This will block.
num += 2
lock.release()


# With RLock, that problem doesn’t happen.
lock = Threading.RLock()

lock.acquire()
num += 3
lock.acquire() # This won’t block.
num += 4
lock.release()
lock.release() # You need to call release once for each call to acquire.
```

### Semaphores

`from threading import BoundedSemaphore`

实际上是稍微复杂一点的带计数的 Lock。当 `Semaphores` 被初始化的时候，会有一个 `max_items` 的 option。每次 `acquire()` 会相应减少1，而 `release()` 又会增加1. 当 `release` 过多的时候会报错。
常用场景：Producer and Consumer

```python
import random, time
from threading import BoundedSemaphore, Thread
max_items = 5
"""
Consider 'container' as a container, of course, with a capacity of 5
items. Defaults to 1 item if 'max_items' is passed.
"""
container = BoundedSemaphore(max_items)
def producer(nloops):
    for i in range(nloops):
        time.sleep(random.randrange(2, 5))
        print(time.ctime(), end=": ")
        try:
            container.release()
            print("Produced an item.")
        except ValueError:
            print("Full, skipping.")
def consumer(nloops):
    for i in range(nloops):
        time.sleep(random.randrange(2, 5))
        print(time.ctime(), end=": ")
        """
        In the following if statement we disable the default
        blocking behaviour by passing False for the blocking flag.
        """
        if container.acquire(False):
            print("Consumed an item.")
        else:
            print("Empty, skipping.")
threads = []
nloops = random.randrange(3, 6)
print("Starting with %s items." % max_items)
threads.append(Thread(target=producer, args=(nloops,)))
threads.append(Thread(target=consumer, args=(random.randrange(nloops, nloops+max_items+2),)))
for thread in threads:  # Starts all the threads.
    thread.start()
for thread in threads:  # Waits for threads to complete before moving on with the main script.
    thread.join()
print("All done.")
```

### Events （对事件型程序特别有用）

`from threading import Event`

Event 是根据一个内部的 flag 来进行执行的。当 `Event.set()` 被调用的时候，对应的已经被 block 的 `Event.wait()` 会被安排执行。可以直接把 Event 看做一个 trigger。

```python
import random, time
from threading import Event, Thread

event = Event()

def waiter(event, nloops):
    for i in range(nloops):
      print(“%s. Waiting for the flag to be set.” % (i+1))
      event.wait() # Blocks until the flag becomes true.
      print(“Wait complete at:”, time.ctime())
      event.clear() # Resets the flag.
      print()

def setter(event, nloops):
    for i in range(nloops):
      time.sleep(random.randrange(2, 5)) # Sleeps for some time.
      event.set()

threads = []
nloops = random.randrange(3, 6)

threads.append(Thread(target=waiter, args=(event, nloops)))
threads[-1].start()
threads.append(Thread(target=setter, args=(event, nloops)))
threads[-1].start()

for thread in threads:
    thread.join()

print(“All done.”)
```

### Conditions

`from threading import Condition

`Condition` 可以看做是一个进阶版的 `Event`。当一个线程调用 `Condition.acquire()` 以后，就可以 block 了其他的正在 `wait()` 的线程，同时利用 `notify()` 去告诉他们需要进行下一步操作。谨记要 `Condition.release()`。

```python
import random, time
from threading import Condition, Thread
"""
'condition' variable will be used to represent the availability of a produced
item.
"""
condition = Condition()
box = []
def producer(box, nitems):
    for i in range(nitems):
        time.sleep(random.randrange(2, 5))  # Sleeps for some time.
        condition.acquire()
        num = random.randint(1, 10)
        box.append(num)  # Puts an item into box for consumption.
        condition.notify()  # Notifies the consumer about the availability.
        print("Produced:", num)
        condition.release()
def consumer(box, nitems):
    for i in range(nitems):
        condition.acquire()
        condition.wait()  # Blocks until an item is available for consumption.
        print("%s: Acquired: %s" % (time.ctime(), box.pop()))
        condition.release()
threads = []
"""
'nloops' is the number of times an item will be produced and
consumed.
"""
nloops = random.randrange(3, 6)
for func in [producer, consumer]:
    threads.append(Thread(target=func, args=(box, nloops)))
    threads[-1].start()  # Starts the thread.
for thread in threads:
    """Waits for the threads to complete before moving on
       with the main script.
    """
    thread.join()
print("All done.")
```

### Barriers

`Barrier` 是一个简单的线程等待变量。当一个线程调用了wait()之后，会等待相应数目的线程调用过 `wait()` 过后才会解除锁定。

```python
from random import randrange
from threading import Barrier, Thread
from time import ctime, sleep

num = 4
# 4 threads will need to pass this barrier to get released.
b = Barrier(num)
names = [“Harsh”, “Lokesh”, “George”, “Iqbal”]

def player():
    name = names.pop()
    sleep(randrange(2, 5))
    print(“%s reached the barrier at: %s” % (name, ctime()))
    b.wait()

threads = []
print(“Race starts now…”)

for i in range(num):
    threads.append(Thread(target=player))
    threads[-1].start()
"""
Following loop enables waiting for the threads to complete before moving on with the main script.
"""
for thread in threads:
    thread.join()
print()
print(“Race over!”)
```

### ZMQ

#### @2019-02-20

Another way to do queueing in multi-threading besides the thread-safe queue, is the ZMQ scheme. ZMQ was first proposed to be created for the high-demanding request handling in the network, but later on it turns out that it is sometimes quite useful in the queueing when implementing a multi-threading system -- especially when you are trying to do low-latency queueing. ZMQ supports three types of queue:

* TCP
* Interprocess
* Innerprocess
The last one can be regarded as the queue in the memory for multithread.

However, one needs to avoid using a large payload when using the Innerprocess queue for multithreading problem. A large payload with very low-latency (implicates extremely high throughput) will cause out-of-memory due to some limitation.
