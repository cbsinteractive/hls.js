import assert from 'assert';
import sinon from 'sinon';
import Hls from '../../../src/hls';
import BufferController from '../../../src/controller/buffer-controller';

describe('BufferController tests', function () {
  let hls;
  let bufferController;
  let clearSpy;
  let flushStub;
  const sandbox = sinon.sandbox.create();

  beforeEach(function () {
    hls = new Hls({});
    bufferController = new BufferController(hls);
    clearSpy = sandbox.spy(bufferController, 'clearLiveBackBuffer');
    flushStub = sandbox.stub(bufferController, 'doFlush');
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('Live back buffer enforcement', function () {
    let mockMedia;
    let mockSourceBuffer;
    let targetDuration;
    let bufStart;
    beforeEach(function () {
      bufStart = 0;
      targetDuration = 5;
      bufferController.media = mockMedia = {
        currentTime: 0
      };
      bufferController.sourceBuffer = mockSourceBuffer = {
        video: {
          buffered: {
            start() { return bufStart },
            length: 1
          }
        }
      };
      bufferController._live = true;
      hls.config.liveBackBufferLength = 10;
    });

    it('should clear on LEVEL_UPDATED', function () {
      const details = {
        fragments: [{ start: 0}],
        totalduration: 6,
        averagetargetduration: 2.8,
        targetduration: 3
      };

      bufferController.onLevelUpdated({ details });
      assert(clearSpy.calledWith(details.averagetargetduration), 'It should prefer averagetargetduration');

      delete details.averagetargetduration;
      bufferController.onLevelUpdated({ details });
      assert(clearSpy.calledWith(details.targetduration), 'It should fall back to targetduration');

      delete details.targetduration;
      bufferController.onLevelUpdated({ details });
      assert(clearSpy.calledWith(10), 'It should default to 10 if no other durations exist');
    });

    it('exits early if not live', function () {
      bufferController.clearLiveBackBuffer(targetDuration);
      assert(flushStub.notCalled);
      assert(!bufferController.flushRange.length);
    });

    it('exits early if liveBackBufferLength is not a finite number, or is less than 0', function () {
      hls.config.liveBackBufferLength = 'foo';
      bufferController.clearLiveBackBuffer();

      hls.config.liveBackBufferLength = -1;
      bufferController.clearLiveBackBuffer();

      assert(flushStub.notCalled);
      assert(!bufferController.flushRange.length);
    });

    it('does not flush if nothing is buffered', function () {
      delete mockSourceBuffer.buffered;
      bufferController.clearLiveBackBuffer(targetDuration);

      mockSourceBuffer = null;
      bufferController.clearLiveBackBuffer(targetDuration);

      assert(flushStub.notCalled);
      assert(!bufferController.flushRange.length);
    });

    it('does not flush if no buffered range intersects with back buffer limit', function () {
      bufStart = 5;
      mockMedia.currentTime = 10;
      bufferController.clearLiveBackBuffer(targetDuration);
      assert(flushStub.notCalled);
      assert(!bufferController.flushRange.length);
    });

    it('does not flush if the liveBackBufferLength is Infinity', function () {
      hls.config.liveBackBufferLength = Infinity;
      mockMedia.currentTime = 15;
      bufferController.clearLiveBackBuffer(targetDuration);
      assert(flushStub.notCalled);
      assert(!bufferController.flushRange.length);
    });

    it('flushes up to the back buffer limit if the buffer intersects with that point', function () {
      mockMedia.currentTime = 15;
      bufferController.clearLiveBackBuffer(targetDuration);
      assert(flushStub.calledOnce);
      assert(bufferController.flushRange.length, 'Should have pushed a flush range');
      assert(!bufferController.flushBufferCounter, 'Should reset the flushBufferCounter');
      assert.deepEqual(bufferController.flushRange[0], {
        start: 0,
        end: 5,
        type: 'video'
      });
    });

    it('flushes to a max of one targetDuration from currentTime, regardless of liveBackBufferLength', function () {
      mockMedia.currentTime = 15;
      hls.config.liveBackBufferLength = 0;
      bufferController.clearLiveBackBuffer(targetDuration);
      assert.deepEqual(bufferController.flushRange[0], {
        start: 0,
        end: 10,
        type: 'video'
      });
    });
  });
});
