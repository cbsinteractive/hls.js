import type { CMCDControllerConfig } from '../../../src/config';
import CMCDController from '../../../src/controller/cmcd-controller';
import HlsMock from '../../mocks/hls.mock';

import chai from 'chai';

const expect = chai.expect;

let cmcdController;

const uuidRegex =
  '[A-F\\d]{8}-[A-F\\d]{4}-4[A-F\\d]{3}-[89AB][A-F\\d]{3}-[A-F\\d]{12}';

const setupEach = function (cmcd?: CMCDControllerConfig) {
  cmcdController = new CMCDController(new HlsMock({ cmcd }) as any);
};

describe('CMCDController', function () {

  describe('cmcdController instance', function () {
    const context = {
      url: 'https://test.com/test.mpd',
    };

    describe('configuration', function () {
      it('does not modify requests when disabled', function () {
        setupEach();

        const { config } = cmcdController.hls;
        expect(config.pLoader).to.equal(undefined);
        expect(config.fLoader).to.equal(undefined);
      });

      it('generates a session id if not provided', function () {
        setupEach({});

        const c = Object.assign({ frag: {} }, context);

        cmcdController.applyPlaylistData(c);
        const regex = new RegExp(`sid%3D%22${uuidRegex}%22`, 'i');
        expect(regex.test(c.url)).to.equal(true);
      });
    });
  });
});
